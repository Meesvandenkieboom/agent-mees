/**
 * Agent Girl - Modern chat interface for Claude Agent SDK
 * Copyright (C) 2025 KenKai
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */

import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Detect if running in WSL (Windows Subsystem for Linux)
 */
function isWSL(): boolean {
  try {
    // Check if /proc/version contains "microsoft" or "WSL"
    if (fs.existsSync('/proc/version')) {
      const version = fs.readFileSync('/proc/version', 'utf8').toLowerCase();
      return version.includes('microsoft') || version.includes('wsl');
    }
  } catch {
    // Ignore errors
  }
  return false;
}

/**
 * Get Windows username from WSL environment
 */
function getWindowsUsername(): string | null {
  try {
    // Try to get Windows username from environment or /mnt/c path
    const wslEnvUser = process.env.WSL_DISTRO_NAME ? process.env.USER : null;

    // Try to read from /mnt/c/Users directory
    if (fs.existsSync('/mnt/c/Users')) {
      const users = fs.readdirSync('/mnt/c/Users');
      // Filter out system folders
      const realUsers = users.filter(u =>
        !['Public', 'Default', 'Default User', 'All Users'].includes(u) &&
        !u.startsWith('.')
      );

      // If there's only one user, use that
      if (realUsers.length === 1) {
        return realUsers[0];
      }

      // Try to match WSL username
      if (wslEnvUser && realUsers.includes(wslEnvUser)) {
        return wslEnvUser;
      }

      // Check current path for username hint
      const cwd = process.cwd();
      if (cwd.startsWith('/mnt/c/Users/')) {
        const username = cwd.split('/')[4];
        if (realUsers.includes(username)) {
          return username;
        }
      }
    }
  } catch {
    // Ignore errors
  }
  return null;
}

/**
 * Get the default working directory for agent operations
 * Cross-platform: ~/Documents/agent-girl (Mac/Linux) or C:\Users\{user}\Documents\agent-girl (Windows)
 * WSL: Uses Windows path (/mnt/c/Users/{user}/Documents/agent-girl)
 */
export function getDefaultWorkingDirectory(): string {
  let homeDir = os.homedir();

  // If running in WSL, use Windows home directory instead
  if (isWSL()) {
    const windowsUser = getWindowsUsername();
    if (windowsUser) {
      homeDir = `/mnt/c/Users/${windowsUser}`;
      console.log('🪟 WSL detected, using Windows home:', homeDir);
    }
  }

  const defaultDir = path.join(homeDir, 'Documents', 'agent-girl');

  // Startup logs are now consolidated in server.ts
  // console.log('🏠 Platform:', os.platform());
  // console.log('🏠 Home directory:', homeDir);
  // console.log('🏠 Default working directory:', defaultDir);

  return defaultDir;
}

/**
 * Get the app data directory for storing database and app files
 * Cross-platform: ~/Documents/agent-girl-app
 */
export function getAppDataDirectory(): string {
  const homeDir = os.homedir();
  const appDataDir = path.join(homeDir, 'Documents', 'agent-girl-app');

  return appDataDir;
}

/**
 * Expand tilde (~) in path to actual home directory
 * Works cross-platform
 */
export function expandPath(dirPath: string): string {
  if (!dirPath) return dirPath;

  // If path starts with ~, replace with home directory
  if (dirPath.startsWith('~/') || dirPath === '~') {
    const homeDir = os.homedir();
    const expanded = dirPath === '~'
      ? homeDir
      : path.join(homeDir, dirPath.slice(2));

    console.log('🔄 Path expansion:', {
      original: dirPath,
      expanded: expanded
    });

    return expanded;
  }

  // Return absolute path as-is
  return path.resolve(dirPath);
}

/**
 * Validate that a directory exists and is accessible
 */
export function validateDirectory(dirPath: string): { valid: boolean; error?: string; expanded?: string } {
  try {
    // Expand path first
    const expanded = expandPath(dirPath);

    // Check if path exists
    if (!fs.existsSync(expanded)) {
      console.warn('⚠️  Directory does not exist:', expanded);
      return {
        valid: false,
        error: 'Directory does not exist',
        expanded
      };
    }

    // Check if it's actually a directory (follows symlinks)
    const stats = fs.statSync(expanded);
    if (!stats.isDirectory()) {
      console.warn('⚠️  Path is not a directory:', expanded);
      return {
        valid: false,
        error: 'Path is not a directory',
        expanded
      };
    }

    // Check if it's a symbolic link (log warning but allow)
    const lstat = fs.lstatSync(expanded);
    if (lstat.isSymbolicLink()) {
      console.warn('⚠️  Path is a symbolic link:', expanded);
      console.log('🔗 Symlink target:', fs.realpathSync(expanded));
    }

    // Check read/write permissions by attempting to access
    try {
      fs.accessSync(expanded, fs.constants.R_OK | fs.constants.W_OK);
    } catch {
      console.warn('⚠️  No read/write permissions:', expanded);
      return {
        valid: false,
        error: 'No read/write permissions',
        expanded
      };
    }

    // Additional safety check: ensure directory is accessible
    try {
      fs.readdirSync(expanded);
    } catch {
      console.warn('⚠️  Directory not accessible:', expanded);
      return {
        valid: false,
        error: 'Directory not accessible (may be deleted or moved)',
        expanded
      };
    }

    // Silent success - only log errors
    return {
      valid: true,
      expanded
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Directory validation error:', errorMessage);
    return {
      valid: false,
      error: errorMessage
    };
  }
}

/**
 * Create directory if it doesn't exist (including parent directories)
 */
export function ensureDirectory(dirPath: string): boolean {
  try {
    const expanded = expandPath(dirPath);

    if (fs.existsSync(expanded)) {
      console.log('📁 Directory already exists:', expanded);
      return true;
    }

    // Create directory recursively
    fs.mkdirSync(expanded, { recursive: true });
    console.log('✅ Directory created:', expanded);
    return true;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Failed to create directory:', errorMessage);
    return false;
  }
}

/**
 * Get platform-specific information for diagnostic logging
 */
export function getPlatformInfo(): {
  os: string;
  platform: string;
  home: string;
  arch: string;
  version: string;
} {
  const info = {
    os: os.type(),
    platform: os.platform(),
    home: os.homedir(),
    arch: os.arch(),
    version: os.release()
  };

  // Startup logs are now consolidated in server.ts
  // console.log('💻 Platform info:', info);
  return info;
}
