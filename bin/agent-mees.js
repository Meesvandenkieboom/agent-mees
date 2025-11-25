#!/usr/bin/env node
/**
 * Agent Mees - Global CLI launcher
 *
 * This script allows running agent-mees from anywhere via:
 *   agent-mees
 *   agent-mees --setup
 *   agent-mees --login
 *   agent-mees --logout
 *   agent-mees --status
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Check if bun is available
const bunAvailable = (() => {
  try {
    spawn('bun', ['--version'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
})();

if (!bunAvailable) {
  console.error('❌ Bun is not installed or not in PATH');
  console.error('📦 Install Bun: https://bun.sh');
  console.error('   curl -fsSL https://bun.sh/install | bash');
  process.exit(1);
}

// Forward all arguments to bun
const args = process.argv.slice(2);
const serverPath = join(projectRoot, 'server', 'server.ts');

console.log('🚀 Starting Agent Mees...\n');

const proc = spawn('bun', ['run', serverPath, ...args], {
  cwd: projectRoot,
  stdio: 'inherit',
  shell: process.platform === 'win32'
});

proc.on('exit', (code) => {
  process.exit(code || 0);
});
