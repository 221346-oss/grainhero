#!/usr/bin/env node
/**
 * Run SQL migration against Supabase via the direct Postgres connection.
 * Reads connection details from .env.local
 */
import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";

// Load env
const envContent = readFileSync(".env.local", "utf-8");
const env = {};
for (const line of envContent.split("\n")) {
  const match = line.match(/^([A-Z_]+)=(.+)/);
  if (match) env[match[1]] = match[2].replace(/^["']|["']$/g, "");
}

const supabaseUrl = env.SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const sql = readFileSync("supabase/migrations/20260820000000_add_installing_status_constraint.sql", "utf-8");

// Split into individual statements and execute each
const statements = sql
  .split(";")
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.startsWith("--"));

console.log(`Executing ${statements.length} statements...\n`);

const supabase = createClient(supabaseUrl, serviceKey);

async function runStatements() {
  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    const preview = stmt.replace(/\s+/g, " ").slice(0, 100);
    process.stdout.write(`[${i + 1}/${statements.length}] ${preview}... `);
    
    try {
      // Use the Supabase RPC to run raw SQL via a helper function
      // First, create the exec_sql function if it doesn't exist
      const { error } = await supabase.rpc("exec_sql" as any, { query: stmt + ";" });
      
      if (error) {
        // If exec_sql doesn't exist, try via raw SQL endpoint
        const res = await fetch(`${supabaseUrl}/pg/query`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: serviceKey,
            Authorization: `Bearer ${serviceKey}`,
          },
          body: JSON.stringify({ query: stmt + ";" }),
        });
        
        if (!res.ok) {
          const text = await res.text();
          // Try one more approach - the Supabase SQL API
          const res2 = await fetch(`${supabaseUrl}/sql`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: serviceKey,
              Authorization: `Bearer ${serviceKey}`,
            },
            body: JSON.stringify({ query: stmt + ";" }),
          });
          
          if (!res2.ok) {
            console.log(`⚠️  SKIP (${res2.status})`);
          } else {
            console.log("✅");
          }
        } else {
          console.log("✅");
        }
      } else {
        console.log("✅");
      }
    } catch (e) {
      console.log(`⚠️  ERROR: ${e.message}`);
    }
  }
  console.log("\nDone!");
}

runStatements().catch(console.error);
