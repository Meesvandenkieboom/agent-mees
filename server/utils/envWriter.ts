/**
 * Environment File Writer Utility
 * Handles writing GitHub OAuth credentials to .env file and reloading environment variables
 */

import * as fs from 'fs';
import * as path from 'path';
import { getBinaryDir } from '../startup';

/**
 * Determine .env file location
 * Dev mode: project root
 * Standalone: binary directory
 */
function getEnvPath(): string {
  const isStandalone = process.env.STANDALONE_BUILD === 'true';

  if (isStandalone) {
    const binaryDir = getBinaryDir();
    return path.join(binaryDir, '.env');
  } else {
    // Dev mode: project root (parent of server directory)
    const serverDir = import.meta.dir;
    const projectRoot = path.dirname(serverDir);
    return path.join(projectRoot, '.env');
  }
}

/**
 * Write GitHub OAuth credentials to .env file
 * Appends if .env exists, creates if not
 * Preserves existing content and updates existing keys
 */
export async function writeGitHubCredentialsToEnv(
  clientId: string,
  clientSecret: string
): Promise<void> {
  const envPath = getEnvPath();

  let envContent = '';

  // Read existing .env if it exists
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf-8');
  }

  // Parse existing content
  const lines = envContent.split('\n');
  const newLines: string[] = [];
  let hasGitHubSection = false;
  let inGitHubSection = false;
  let clientIdSet = false;
  let clientSecretSet = false;
  let redirectUriSet = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // Detect GitHub section
    if (trimmed.includes('GitHub Configuration') || trimmed.includes('GitHub OAuth')) {
      hasGitHubSection = true;
      inGitHubSection = true;
      newLines.push(line);
      continue;
    }

    // Exit section on next major section (separator line)
    if (inGitHubSection && trimmed.startsWith('# ====')) {
      inGitHubSection = false;
    }

    // Update existing keys
    if (trimmed.startsWith('GITHUB_CLIENT_ID=')) {
      newLines.push(`GITHUB_CLIENT_ID=${clientId}`);
      clientIdSet = true;
      continue;
    }

    if (trimmed.startsWith('GITHUB_CLIENT_SECRET=')) {
      newLines.push(`GITHUB_CLIENT_SECRET=${clientSecret}`);
      clientSecretSet = true;
      continue;
    }

    if (trimmed.startsWith('GITHUB_REDIRECT_URI=')) {
      redirectUriSet = true;
    }

    newLines.push(line);
  }

  // Add GitHub section if it doesn't exist
  if (!hasGitHubSection) {
    if (newLines.length > 0 && newLines[newLines.length - 1].trim() !== '') {
      newLines.push('');
    }
    newLines.push('# =============================================================================');
    newLines.push('# GitHub Configuration');
    newLines.push('# =============================================================================');
    newLines.push('# OAuth app credentials from: https://github.com/settings/developers');
  }

  // Add missing keys
  if (!clientIdSet) {
    newLines.push(`GITHUB_CLIENT_ID=${clientId}`);
  }

  if (!clientSecretSet) {
    newLines.push(`GITHUB_CLIENT_SECRET=${clientSecret}`);
  }

  if (!redirectUriSet) {
    newLines.push('GITHUB_REDIRECT_URI=http://localhost:3001/api/github/callback');
  }

  // Write back to file
  const finalContent = newLines.join('\n');
  fs.writeFileSync(envPath, finalContent, 'utf-8');

  console.log('✅ GitHub credentials written to:', envPath);
}

/**
 * Reload environment variables after writing .env
 * Updates process.env with new values
 */
export function reloadEnvironmentVariables(): void {
  const envPath = getEnvPath();

  if (!fs.existsSync(envPath)) {
    console.warn('⚠️  .env file not found at:', envPath);
    return;
  }

  const envContent = fs.readFileSync(envPath, 'utf-8');

  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();

    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith('#')) return;

    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim();

      // Remove quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }

      process.env[key] = value;

      // Only log GitHub keys for verification
      if (key.startsWith('GITHUB_')) {
        console.log(`✅ Reloaded ${key}`);
      }
    }
  });

  console.log('✅ Environment variables reloaded');
}
