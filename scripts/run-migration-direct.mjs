#!/usr/bin/env node
/**
 * Apply migration via Supabase SQL API endpoint.
 * Reads .env.local for credentials.
 */
import { readFileSync } from "fs";

// Load env
const envContent = readFileSync(".env.local", "utf-8");
const env = {};
for (const line of envContent.split("\n")) {
  const match = line.match(/^([A-Z_]+)=(.+)/);
  if (match) env[match[1]] = match[2].replace(/^["']|["']$/g, "");
}

const url = env.SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const sql = readFileSync("supabase/migrations/20260820000000_add_installing_status_constraint.sql", "utf-8");

async function run() {
  // Try the Supabase SQL API endpoint
  const endpoints = [
    `${url}/pg/query`,
    `${url}/sql`,
    `${url}/rest/v1/`,
  ];

  for (const endpoint of endpoints) {
    console.log(`Trying ${endpoint}...`);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: key,
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({ query: sql }),
      });
      const text = await res.text();
      console.log(`  Status: ${res.status}`);
      console.log(`  Response: ${text.slice(0, 500)}`);
      if (res.ok) {
        console.log("\n✅ Migration applied successfully!");
        return;
      }
    } catch (e) {
      console.log(`  Error: ${e.message}`);
    }
  }

  console.log("\n❌ Could not apply migration via API. Please run manually in Supabase Dashboard SQL Editor.");
  console.log(`URL: ${url.replace(".supabase.co", ".supabase.com/dashboard/sql/new")}`);
  console.log("Paste contents of: supabase/migrations/20260820000000_add_installing_status_constraint.sql");
}

run();
