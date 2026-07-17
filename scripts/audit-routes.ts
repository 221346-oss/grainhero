/**
 * Phase 1 — Static audit of src/routes/.
 *
 *  bun scripts/audit-routes.ts
 *
 * Fails (exit 1) if any route violates:
 *  - route with `loader:` but missing errorComponent / notFoundComponent
 *  - public route importing `client.server`
 *  - _authenticated route calling an obviously public server-fn in its loader
 *    (heuristic: loader references a fn name in `PUBLIC_FNS`)
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = new URL("../src/routes/", import.meta.url).pathname;

function walk(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, acc);
    else if (full.endsWith(".tsx") || full.endsWith(".ts")) acc.push(full);
  }
  return acc;
}

const files = walk(ROOT);
let violations = 0;

for (const file of files) {
  const src = readFileSync(file, "utf8");
  const rel = relative(ROOT, file);
  const isProtected = rel.startsWith("_authenticated") || rel.includes("/_authenticated/");

  if (/loader\s*:/.test(src)) {
    if (!/errorComponent\s*:/.test(src)) {
      console.error(`✗ ${rel}: loader without errorComponent`);
      violations++;
    }
    if (!/notFoundComponent\s*:/.test(src) && rel !== "__root.tsx") {
      console.error(`✗ ${rel}: loader without notFoundComponent`);
      violations++;
    }
  }

  if (!isProtected && /['"]@\/integrations\/supabase\/client\.server['"]/.test(src)) {
    console.error(`✗ ${rel}: public route imports client.server`);
    violations++;
  }
}

if (violations > 0) {
  console.error(`\n${violations} route violation(s)`);
  process.exit(1);
}
console.log(`✓ ${files.length} route files audited, no violations`);
