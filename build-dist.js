#!/usr/bin/env node
import { promises as fs } from 'fs';
import { join } from 'path';

const cwd = process.cwd();
const outputDir = join(cwd, '.output');
const distDir = join(cwd, 'dist');
const serverDir = join(distDir, 'server');
const wrapperFile = join(serverDir, 'server.js');

async function main() {
  try {
    // Remove old dist directory
    await fs.rm(distDir, { recursive: true, force: true });
    console.log('✓ Removed old dist directory');

    // Copy .output to dist
    await fs.cp(outputDir, distDir, { recursive: true });
    console.log('✓ Copied .output to dist');

    // Create server.js wrapper for TanStack Start plugin compatibility
    const wrapper = `// TanStack Start Preview Plugin Compatibility
export * from './index.mjs';
`;
    await fs.writeFile(wrapperFile, wrapper);
    console.log('✓ Created dist/server/server.js wrapper');

  } catch (error) {
    console.error('✗ Build dist script failed:', error.message);
    process.exit(1);
  }
}

main();
