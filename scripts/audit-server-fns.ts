/**
 * Phase 1 — Static audit of createServerFn files.
 *
 *  bun scripts/audit-server-fns.ts
 *
 * Fails (exit 1) if:
 *  - a *.functions.ts file imports client.server at module top level
 *  - a createServerFn call omits requireSupabaseAuth AND the fn is not
 *    listed in docs/public-server-fns.md
 *  - process.env is read at module scope (heuristic)
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const SRC = new URL("../src/", import.meta.url).pathname;
const DOC = new URL("../docs/public-server-fns.md", import.meta.url).pathname;

function walk(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, acc);
    else if (full.endsWith(".functions.ts") || full.endsWith(".functions.tsx")) acc.push(full);
  }
  return acc;
}

const publicDoc = (() => {
  try {
    return readFileSync(DOC, "utf8");
  } catch {
    return "";
  }
})();

const files = walk(SRC);
let violations = 0;

for (const file of files) {
  const src = readFileSync(file, "utf8");
  const rel = relative(SRC, file);

  // Top-level client.server import
  const topLevel = src.split(/\.handler\s*\(/)[0];
  if (/from\s+['"]@\/integrations\/supabase\/client\.server['"]/.test(topLevel)) {
    console.error(`✗ ${rel}: top-level import of client.server (load inside handler)`);
    violations++;
  }

  // Module-scope process.env reads (unindented top-level declarations only).
  for (const line of topLevel.split("\n")) {
    if (/^(const|let|var)\s+\w+\s*=\s*process\.env\./.test(line)) {
      console.error(`✗ ${rel}: module-scope process.env read — move inside handler`);
      violations++;
    }
  }

  // Every createServerFn should have requireSupabaseAuth OR be documented public
  const fnMatches = src.matchAll(/export\s+const\s+(\w+)\s*=\s*createServerFn/g);
  for (const m of fnMatches) {
    const name = m[1];
    // Find the chain for this fn (next 800 chars is generous)
    const start = m.index ?? 0;
    const chain = src.slice(start, start + 1600);
    const hasAuth = /requireSupabaseAuth/.test(chain);
    if (!hasAuth) {
      const documented = publicDoc.includes(`\`${name}\``) || publicDoc.includes(name);
      if (!documented) {
        console.error(
          `✗ ${rel}::${name}: no requireSupabaseAuth and not listed in docs/public-server-fns.md`,
        );
        violations++;
      }
    }
  }
}

if (violations > 0) {
  console.error(`\n${violations} server-fn violation(s)`);
  process.exit(1);
}
console.log(`✓ ${files.length} server-fn files audited, no violations`);
