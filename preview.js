#!/usr/bin/env node
import { spawn } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { rmSync, existsSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const serverDir = join(__dirname, '.output', 'server');
const wranglerCacheDir = join(__dirname, '.wrangler');

// Clean up wrangler cache to avoid config conflicts
if (existsSync(wranglerCacheDir)) {
  console.log('Cleaning Wrangler cache...');
  try {
    rmSync(wranglerCacheDir, { recursive: true, force: true });
  } catch (error) {
    console.warn('Warning: Could not clean Wrangler cache:', error.message);
  }
}

console.log('Starting Wrangler preview server...');
console.log('Server directory:', serverDir);

const wrangler = spawn('npx', ['wrangler', 'dev'], {
  cwd: serverDir,
  stdio: 'inherit',
  shell: true
});

wrangler.on('error', (error) => {
  console.error('Failed to start preview server:', error);
  process.exit(1);
});

wrangler.on('exit', (code) => {
  process.exit(code || 0);
});

process.on('SIGINT', () => {
  wrangler.kill('SIGINT');
});

process.on('SIGTERM', () => {
  wrangler.kill('SIGTERM');
});
