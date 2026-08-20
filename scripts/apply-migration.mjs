// Quick migration runner — uses Supabase service-role key to execute raw SQL
import { readFileSync } from "fs";

// Load env from .env.local
const envContent = readFileSync(".env.local", "utf-8");
for (const line of envContent.split("\n")) {
  const match = line.match(/^([A-Z_]+)=(.+)/);
  if (match) process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const sql = readFileSync("supabase/migrations/20260820000000_add_installing_status_constraint.sql", "utf-8");

async function run() {
  // Use the Supabase SQL endpoint (pg_net compatible)
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
    },
    body: JSON.stringify({ query: sql }),
  });

  if (res.ok) {
    const data = await res.json();
    console.log("✅ Migration applied successfully:", data);
    return;
  }

  // rpc/exec_sql might not exist — try the PostgREST /rpc approach
  // Fall back to running each statement individually via the Management API
  console.log("rpc method unavailable, trying individual statements...");

  const statements = sql
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith("--"));

  for (const stmt of statements) {
    console.log(`\nRunning: ${stmt.slice(0, 80)}...`);
    try {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SERVICE_KEY,
          Authorization: `Bearer ${SERVICE_KEY}`,
          Prefer: "return=representation",
        },
        // This won't work for DDL. Let's try a different approach.
      });
    } catch {}
  }

  // The best approach: use Supabase's SQL API endpoint
  // POST to /pg for direct Postgres access, or use the dashboard API
  console.log("\n⚠️  Could not run DDL via REST API. Trying Supabase SQL endpoint...");

  const sqlRes = await fetch(`${SUPABASE_URL}/pg/query`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
    },
    body: JSON.stringify({ query: sql }),
  });

  if (sqlRes.ok) {
    const data = await sqlRes.json();
    console.log("✅ Migration applied:", JSON.stringify(data).slice(0, 200));
  } else {
    const text = await sqlRes.text();
    console.error(`❌ SQL endpoint returned ${sqlRes.status}:`, text.slice(0, 300));

    // Last resort: try Supabase's database webhooks / SQL editor API
    console.log("\n⚠️  Direct SQL execution not available via API.");
    console.log("Please run the migration manually in the Supabase Dashboard:");
    console.log(`1. Go to ${SUPABASE_URL.replace(".supabase.co", ".supabase.com/dashboard")}/sql/new`);
    console.log("2. Paste the contents of supabase/migrations/20260820000000_add_installing_status_constraint.sql");
    console.log("3. Click 'Run'");
  }
}

run().catch(console.error);
