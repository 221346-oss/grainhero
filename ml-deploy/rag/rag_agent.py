"""
GrainHero RAG - Agentic Routing & Generation Engine (Phase 4)
=============================================================
This is the brain of the GrainHero AI assistant. It:

  1. Classifies user query intent (static knowledge vs. live IoT vs. both)
  2. Calls the appropriate tools in parallel:
       - query_knowledge_base  -> hybrid vector+keyword search on RAG store
       - get_live_telemetry    -> real-time sensor readings from Supabase
       - get_actuator_status   -> fan/valve state from Supabase
  3. Fuses context into a zero-hallucination industrial prompt
  4. Calls Gemini (primary) with automatic failover to a secondary provider

Usage:
  python rag_agent.py --query "Is Silo 3 at risk right now?"
  python rag_agent.py --query "What temperature is dangerous for wheat?"
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import sys
import time
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import httpx
from dotenv import load_dotenv
from supabase import create_client, Client

# ── Environment ───────────────────────────────────────────────────────────────
ENV_PATH = Path(__file__).resolve().parent.parent.parent / ".env"
load_dotenv(dotenv_path=ENV_PATH)

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s - %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger("rag_agent")

# ── Credentials (hardcoded fallbacks for development) ─────────────────────────
SUPABASE_URL     = os.getenv("SUPABASE_URL",     "https://frfgmbgzildtfchtmchr.supabase.co")
SUPABASE_KEY     = os.getenv("SUPABASE_SERVICE_ROLE_KEY",
                   "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZyZmdtYmd6aWxkdGZjaHRtY2hyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzY3ODg3MSwiZXhwIjoyMDkzMjU0ODcxfQ.e4xUbm3sXmKwUtYSvgS5GzxItpH3WE5O0JZoaSQdKQQ")
GEMINI_API_KEY   = os.getenv("GEMINI_API_KEY",   "YOUR_GEMINI_API_KEY")
DEFAULT_TENANT   = os.getenv("DEFAULT_TENANT_ID","8f58c2d3-e610-4540-bc99-c946b3659b51")

GEMINI_GEN_URL   = (
    "https://generativelanguage.googleapis.com/v1beta/models/"
    "gemini-flash-latest:generateContent?key=" + GEMINI_API_KEY
)
GEMINI_EMBED_URL = (
    "https://generativelanguage.googleapis.com/v1beta/models/"
    "gemini-embedding-001:embedContent?key=" + GEMINI_API_KEY
)


# =============================================================================
# Intent Classifier
# =============================================================================

class IntentClassifier:
    """
    Lightweight keyword-based intent router.
    Decides which tools to invoke before calling the LLM.
    """

    LIVE_DATA_TRIGGERS = [
        "right now", "current", "currently", "live", "latest",
        "today", "now", "real-time", "at the moment", "sensor",
        "reading", "temperature now", "humidity now", "is it safe",
        "silo", "bin", "status", "fan", "actuator", "running",
    ]

    KNOWLEDGE_TRIGGERS = [
        "how to", "what is", "explain", "manual", "guide",
        "recommend", "threshold", "optimal", "safe level",
        "best practice", "prevent", "detect", "why", "when",
        "protocol", "procedure", "standard", "should i",
    ]

    def classify(self, query: str) -> Dict[str, bool]:
        q = query.lower()
        needs_live = any(t in q for t in self.LIVE_DATA_TRIGGERS)
        needs_knowledge = any(t in q for t in self.KNOWLEDGE_TRIGGERS)

        # Default: always include knowledge base
        if not needs_live and not needs_knowledge:
            needs_knowledge = True

        result = {
            "query_knowledge_base": needs_knowledge or needs_live,
            "get_live_telemetry":   needs_live,
            "get_actuator_status":  needs_live,
        }
        logger.info("Intent: knowledge=%s | live_telemetry=%s | actuator=%s",
                    result["query_knowledge_base"],
                    result["get_live_telemetry"],
                    result["get_actuator_status"])
        return result


# =============================================================================
# Tool: Knowledge Base Query
# =============================================================================

def tool_query_knowledge_base(query: str, tenant_id: str, top_k: int = 4) -> List[Dict]:
    """Runs the full Hybrid Search + RRF + Re-ranking pipeline from Phase 3."""
    try:
        sys.path.insert(0, str(Path(__file__).resolve().parent))
        from rag_retrieval import HybridRetriever
        retriever = HybridRetriever()
        results = retriever.retrieve(query, tenant_id=tenant_id, top_k=top_k)
        return results
    except Exception as e:
        logger.error("knowledge_base tool failed: %s", e)
        return []


# =============================================================================
# Tool: Live Telemetry
# =============================================================================

def tool_get_live_telemetry(tenant_id: str, silo_name: Optional[str] = None) -> List[Dict]:
    """
    Fetches the latest sensor readings from Supabase.
    Queries sensor_readings table for the most recent entries per silo.
    """
    try:
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

        # Try sensor_readings first, then live_sensor_readings as fallback
        for table in ["sensor_readings", "live_sensor_readings"]:
            try:
                q = (supabase.table(table)
                     .select("*")
                     .order("created_at", desc=True)
                     .limit(5))

                res = q.execute()
                if res.data:
                    logger.info("Live telemetry: %d readings from '%s'", len(res.data), table)
                    return res.data
            except Exception:
                continue

        logger.warning("No live telemetry found in any known table.")
        return []

    except Exception as e:
        logger.error("live_telemetry tool failed: %s", e)
        return []


# =============================================================================
# Tool: Actuator Status
# =============================================================================

def tool_get_actuator_status(tenant_id: str) -> List[Dict]:
    """Fetches current actuator (fan/valve) states from Supabase."""
    try:
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

        for table in ["actuator_commands", "actuators", "actuator_states"]:
            try:
                res = (supabase.table(table)
                       .select("*")
                       .order("created_at", desc=True)
                       .limit(10)
                       .execute())
                if res.data:
                    logger.info("Actuator status: %d records from '%s'", len(res.data), table)
                    return res.data
            except Exception:
                continue

        logger.warning("No actuator data found.")
        return []

    except Exception as e:
        logger.error("actuator_status tool failed: %s", e)
        return []


# =============================================================================
# Context Assembler
# =============================================================================

def assemble_context(
    knowledge_chunks: List[Dict],
    telemetry: List[Dict],
    actuators: List[Dict],
) -> str:
    """Builds a structured, labelled context block for the LLM prompt."""
    parts = []

    # --- Operational Manuals Context ---
    if knowledge_chunks:
        parts.append("=== OPERATIONAL MANUALS & RESEARCH (Retrieved Context) ===")
        for i, chunk in enumerate(knowledge_chunks, 1):
            doc   = chunk.get("document_title", "Unknown Document")
            score = chunk.get("final_score", 0.0)
            text  = chunk.get("chunk_content", "").strip()[:600]
            parts.append(f"[Source {i} | {doc} | Relevance: {score:.3f}]\n{text}")
        parts.append("")

    # --- Live Sensor Data ---
    if telemetry:
        parts.append("=== LIVE SENSOR READINGS (Real-Time IoT Data) ===")
        for reading in telemetry[:3]:
            # Normalize field names across different table schemas
            temp    = reading.get("temperature") or reading.get("Temperature") or "N/A"
            hum     = reading.get("humidity")    or reading.get("Humidity")    or "N/A"
            co2     = reading.get("co2")         or reading.get("CO2")         or "N/A"
            moist   = reading.get("grain_moisture") or reading.get("Grain_Moisture") or "N/A"
            grain   = reading.get("grain_type")  or reading.get("grain")       or "N/A"
            silo    = reading.get("silo_id")     or reading.get("device_id")   or "N/A"
            ts      = reading.get("created_at")  or reading.get("timestamp")   or "N/A"

            parts.append(
                f"  Silo/Device : {silo}\n"
                f"  Grain Type  : {grain}\n"
                f"  Temperature : {temp} C\n"
                f"  Humidity    : {hum} %\n"
                f"  CO2         : {co2} ppm\n"
                f"  Moisture    : {moist} %\n"
                f"  Timestamp   : {ts}"
            )
        parts.append("")

    # --- Actuator Status ---
    if actuators:
        parts.append("=== ACTUATOR STATUS (Current System State) ===")
        for act in actuators[:5]:
            name    = act.get("actuator_name") or act.get("device_id") or "Unknown"
            state   = act.get("command")       or act.get("state")     or "Unknown"
            updated = act.get("created_at")    or act.get("timestamp") or "N/A"
            parts.append(f"  {name}: {state} (as of {updated})")
        parts.append("")

    if not parts:
        return "No context data available."

    return "\n".join(parts)


# =============================================================================
# Prompt Builder
# =============================================================================

SYSTEM_PROMPT = """You are GrainHero AI, an industrial grain storage safety assistant.
Your role is to give precise, actionable guidance to grain storage operators and farm managers.

STRICT RULES YOU MUST FOLLOW:
1. Answer ONLY using the CONTEXT provided below (manuals + live sensor data).
2. If the context does not contain enough information, say exactly:
   "I do not have sufficient data in the operational manuals or live sensors to answer this reliably."
3. NEVER invent, guess, or hallucinate grain safety parameters, sensor values, or thresholds.
4. When live sensor data is available, always reference it explicitly (e.g. "Current temperature is 38.2C").
5. When recommending actions, be specific and operational (e.g. "Activate aeration fan for at least 4 hours").
6. Keep responses concise and structured. Use bullet points for action items."""


def build_prompt(query: str, context: str) -> List[Dict]:
    """Builds the message list for the Gemini API."""
    user_message = f"""CONTEXT:
{context}

USER QUERY:
{query}

Please provide a precise, grounded operational response based solely on the context above."""

    return [
        {"role": "user", "parts": [{"text": SYSTEM_PROMPT + "\n\n" + user_message}]}
    ]


# =============================================================================
# LLM Generation Engine with Failover
# =============================================================================

def call_gemini(messages: List[Dict], timeout: int = 30) -> Optional[str]:
    """Calls Gemini 1.5 Flash for generation with retry on 429."""
    payload = {
        "contents": messages,
        "generationConfig": {
            "temperature": 0.1,   # Low temp = deterministic / factual
            "maxOutputTokens": 1024,
            "topP": 0.8,
        },
    }
    for attempt in range(1, 4):
        try:
            with httpx.Client(timeout=timeout) as client:
                resp = client.post(
                    GEMINI_GEN_URL,
                    headers={"Content-Type": "application/json"},
                    json=payload,
                )
                if resp.status_code == 429:
                    wait = attempt * 5
                    logger.warning("Gemini 429 rate limit hit. Waiting %ds (attempt %d/3)...", wait, attempt)
                    time.sleep(wait)
                    continue
                resp.raise_for_status()
                data = resp.json()
                candidates = data.get("candidates", [])
                if candidates:
                    return candidates[0]["content"]["parts"][0]["text"]
                return None
        except Exception as e:
            logger.warning("Gemini primary call failed (attempt %d/3): %s", attempt, e)
            if attempt < 3:
                time.sleep(3)
    return None


def call_llm_with_failover(messages: List[Dict]) -> str:
    """
    Tries Gemini primary first with retries. On failure, falls back gracefully to secondary model.
    """
    logger.info("Calling primary LLM (Gemini 1.5 Flash 001)...")
    result = call_gemini(messages)

    if result:
        logger.info("Primary LLM responded successfully.")
        return result

    # Fallback model
    logger.warning("Primary failed. Trying fallback model (Gemini 1.5 Flash 002)...")
    fallback_url = GEMINI_GEN_URL.replace("gemini-flash-latest", "gemini-2.5-flash")
    try:
        payload = {
            "contents": messages,
            "generationConfig": {"temperature": 0.1, "maxOutputTokens": 1024},
        }
        with httpx.Client(timeout=25) as client:
            resp = client.post(
                fallback_url,
                headers={"Content-Type": "application/json"},
                json=payload,
            )
            resp.raise_for_status()
            data = resp.json()
            candidates = data.get("candidates", [])
            if candidates:
                logger.info("Fallback LLM responded successfully.")
                return candidates[0]["content"]["parts"][0]["text"]
    except Exception as e:
        logger.error("Fallback LLM also failed: %s", e)

    return ("I am currently unable to process your query due to a service disruption. "
            "Please check sensor readings manually and consult the operational manual.")


# =============================================================================
# Main Agent
# =============================================================================

class GrainHeroAgent:
    def __init__(self, tenant_id: str = DEFAULT_TENANT):
        self.tenant_id  = tenant_id
        self.classifier = IntentClassifier()
        logger.info("GrainHero Agent initialized. Tenant: %s", tenant_id)

    def run(self, query: str) -> str:
        """Full pipeline: intent -> tools -> context fusion -> LLM -> answer."""
        logger.info("Processing query: '%s'", query)

        # Step 1: Classify intent
        intent = self.classifier.classify(query)

        # Step 2: Execute tools based on intent
        knowledge_chunks = []
        telemetry        = []
        actuators        = []

        if intent["query_knowledge_base"]:
            logger.info("Executing tool: query_knowledge_base")
            knowledge_chunks = tool_query_knowledge_base(query, self.tenant_id, top_k=4)

        if intent["get_live_telemetry"]:
            logger.info("Executing tool: get_live_telemetry")
            telemetry = tool_get_live_telemetry(self.tenant_id)

        if intent["get_actuator_status"] and telemetry:
            logger.info("Executing tool: get_actuator_status")
            actuators = tool_get_actuator_status(self.tenant_id)

        # Step 3: Assemble context
        context = assemble_context(knowledge_chunks, telemetry, actuators)

        # Step 4: Build prompt
        messages = build_prompt(query, context)

        # Step 5: Generate answer with failover
        answer = call_llm_with_failover(messages)

        return answer


# =============================================================================
# CLI
# =============================================================================

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="GrainHero Agentic RAG Assistant")
    parser.add_argument("--query",     type=str, required=True, help="User question")
    parser.add_argument("--tenant-id", type=str, default=DEFAULT_TENANT, help="Tenant UUID")
    args = parser.parse_args()

    agent  = GrainHeroAgent(tenant_id=args.tenant_id)
    answer = agent.run(args.query)

    print("\n" + "="*65)
    print("GRAINHERO AI RESPONSE")
    print("="*65)
    print(answer)
    print("="*65 + "\n")
