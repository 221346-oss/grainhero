import os
import sys
from dotenv import load_dotenv
from supabase import create_client, Client
import httpx

# Load environment variables
env_path = os.path.join(os.path.dirname(__file__), "..", "..", ".env")
load_dotenv(dotenv_path=env_path)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not all([SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GEMINI_API_KEY]):
    print("Error: Missing required environment variables (.env file)")
    sys.exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

def embed_query(text: str) -> list[float]:
    """Generate embedding for the query using Gemini."""
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key={GEMINI_API_KEY}"
    payload = {
        "model": "models/gemini-embedding-001",
        "content": {"parts": [{"text": text}]}
    }
    
    with httpx.Client(timeout=10) as client:
        response = client.post(url, headers={"Content-Type": "application/json"}, json=payload)
        response.raise_for_status()
        return response.json()["embedding"]["values"]

def test_query(query: str):
    print(f"\n🔍 Querying: '{query}'")
    try:
        # 1. Embed query
        query_embedding = embed_query(query)
        
        # 2. Search Supabase using the match_documents RPC function
        response = supabase.rpc(
            "match_documents", 
            {
                "query_embedding": query_embedding,
                "query_tenant_id": "00000000-0000-0000-0000-000000000000", # Example empty UUID if tenant_id is needed, or modify based on your schema
                "match_threshold": 0.5,
                "match_count": 3
            }
        ).execute()
        
        results = response.data
        if not results:
            print("No matching documents found.")
            return

        print(f"✅ Found {len(results)} matches:")
        for i, res in enumerate(results):
            title = res.get('document_title', 'Unknown')
            score = res.get('similarity', 0)
            content = res.get('chunk_content', '')[:150].replace('\n', ' ')
            print(f"  {i+1}. [{score:.3f}] {title} - {content}...")

    except Exception as e:
        print(f"❌ Error during query: {e}")

if __name__ == "__main__":
    test_query("How to monitor grain temperature?")
