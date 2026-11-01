#!/usr/bin/env node

/**
 * Ultimate Downloader — Automated Test Suite Runner (ESM)
 * 
 * Invokes Node.js native test runner (`node --test`) across all
 * unit and integration test suites:
 * - tests/server.test.ts
 * - tests/extractor.test.ts
 * 
 * Can be run via:
 *   node tests/run-tests.js
 *   npm test
 */

import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BOLD = '\x1b[1m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';
const DIM = '\x1b[2m';
const RESET = '\x1b[0m';

console.log(`${CYAN}${BOLD}`);
console.log('  ======================================================');
console.log('       Ultimate Downloader — Automated Test Runner      ');
console.log('  ======================================================');
console.log(`${RESET}`);

const rootDir = path.resolve(__dirname, '..');
const serverNodeModules = path.join(rootDir, 'server', 'node_modules');
const clientNodeModules = path.join(rootDir, 'client', 'node_modules');

// Prepare NODE_PATH so tests can resolve dependencies like cheerio
const nodePaths = [
  path.join(rootDir, 'node_modules'),
  serverNodeModules,
  clientNodeModules,
  process.env.NODE_PATH || '',
].filter(Boolean).join(path.delimiter);

const testFiles = [
  path.join(__dirname, 'server.test.ts'),
  path.join(__dirname, 'extractor.test.ts'),
];

console.log(`${DIM}Root Directory: ${rootDir}${RESET}`);
console.log(`${DIM}Node.js Version: ${process.version}${RESET}`);
console.log(`${DIM}Discovered Test Suites:${RESET}`);
testFiles.forEach((file) => {
  console.log(`  ${CYAN}•${RESET} ${path.relative(rootDir, file)}`);
});
console.log('');

const args = [
  '--experimental-strip-types',
  '--test',
  ...testFiles,
];

const env = {
  ...process.env,
  NODE_PATH: nodePaths,
  FORCE_COLOR: '1',
};

const startTime = Date.now();

const child = spawn(process.execPath, args, {
  cwd: rootDir,
  env,
  stdio: 'inherit',
});

child.on('error', (err) => {
  console.error(`${RED}${BOLD}Failed to spawn test runner:${RESET}`, err.message);
  process.exit(1);
});

child.on('close', (code) => {
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log('');
  if (code === 0) {
    console.log(`${GREEN}${BOLD}✔ All test suites passed successfully in ${duration}s!${RESET}`);
    process.exit(0);
  } else {
    console.log(`${RED}${BOLD}✖ Tests failed with exit code ${code} in ${duration}s.${RESET}`);
    process.exit(code || 1);
  }
});
