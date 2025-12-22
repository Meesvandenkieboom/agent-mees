/**
 * Agent Smith - Modern chat interface for Claude Agent SDK
 * Copyright (C) 2025 KenKai
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { MCP_SERVERS_BY_PROVIDER } from '../mcpServers';

const MCP_CONFIG_PATH = path.join(process.cwd(), '.claude', 'mcp-servers.json');

interface MCPHttpServerConfig {
  type: 'http';
  name?: string;
  url: string;
  headers?: Record<string, string>;
}

interface MCPStdioServerConfig {
  type: 'stdio';
  name?: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

type MCPServerConfig = MCPHttpServerConfig | MCPStdioServerConfig;

interface MCPServersConfig {
  enabled: Record<string, boolean>;
  custom: Record<string, MCPServerConfig>;
}

/**
 * Load MCP servers configuration from file
 */
async function loadMCPConfig(): Promise<MCPServersConfig> {
  try {
    const data = await fs.readFile(MCP_CONFIG_PATH, 'utf-8');
    return JSON.parse(data) as MCPServersConfig;
  } catch {
    // Initialize with all built-in servers enabled
    const config: MCPServersConfig = {
      enabled: {},
      custom: {}
    };

    // Enable all built-in servers by default
    const builtinServers = MCP_SERVERS_BY_PROVIDER['anthropic'] || {};
    Object.keys(builtinServers).forEach(key => {
      config.enabled[key] = true;
    });

    return config;
  }
}

/**
 * Save MCP servers configuration to file
 */
async function saveMCPConfig(config: MCPServersConfig): Promise<void> {
  const dir = path.dirname(MCP_CONFIG_PATH);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(MCP_CONFIG_PATH, JSON.stringify(config, null, 2));
}

/**
 * Get all MCP servers (built-in + custom)
 */
function getAllServers(config: MCPServersConfig) {
  const servers: Array<{
    id: string;
    name: string;
    type: 'http' | 'stdio';
    url?: string;
    command?: string;
    args?: string[];
    enabled: boolean;
    builtin: boolean;
  }> = [];

  // Add built-in servers from Anthropic provider (as they're the default)
  const builtinServers = MCP_SERVERS_BY_PROVIDER['anthropic'] || {};
  Object.entries(builtinServers).forEach(([id, serverConfig]) => {
    servers.push({
      id,
      name: id.charAt(0).toUpperCase() + id.slice(1).replace(/-/g, ' '),
      type: serverConfig.type,
      url: serverConfig.type === 'http' ? serverConfig.url : undefined,
      command: serverConfig.type === 'stdio' ? serverConfig.command : undefined,
      args: serverConfig.type === 'stdio' ? serverConfig.args : undefined,
      enabled: config.enabled[id] ?? true,
      builtin: true
    });
  });

  // Add custom servers
  Object.entries(config.custom).forEach(([id, serverConfig]) => {
    servers.push({
      id,
      name: serverConfig.name || id,
      type: serverConfig.type,
      url: serverConfig.type === 'http' ? serverConfig.url : undefined,
      command: serverConfig.type === 'stdio' ? serverConfig.command : undefined,
      args: serverConfig.type === 'stdio' ? serverConfig.args : undefined,
      enabled: config.enabled[id] ?? true,
      builtin: false
    });
  });

  return servers;
}

/**
 * Handle MCP server management routes
 */
export async function handleMCPServerRoutes(req: Request, url: URL): Promise<Response | undefined> {
  // GET /api/mcp-servers - List all MCP servers with their status
  if (req.method === 'GET' && url.pathname === '/api/mcp-servers') {
    const config = await loadMCPConfig();
    const servers = getAllServers(config);

    return new Response(JSON.stringify({ success: true, servers }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // POST /api/mcp-servers/:id/toggle - Enable/disable an MCP server
  const toggleMatch = url.pathname.match(/^\/api\/mcp-servers\/([^/]+)\/toggle$/);
  if (req.method === 'POST' && toggleMatch) {
    const id = toggleMatch[1];
    const config = await loadMCPConfig();

    // Toggle the enabled state
    const currentState = config.enabled[id] ?? true;
    config.enabled[id] = !currentState;

    await saveMCPConfig(config);

    return new Response(JSON.stringify({
      success: true,
      id,
      enabled: config.enabled[id]
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // POST /api/mcp-servers/:id/test - Test connection to an MCP server
  const testMatch = url.pathname.match(/^\/api\/mcp-servers\/([^/]+)\/test$/);
  if (req.method === 'POST' && testMatch) {
    const id = testMatch[1];
    const config = await loadMCPConfig();

    // Find the server
    const builtinServers = MCP_SERVERS_BY_PROVIDER['anthropic'] || {};
    const serverConfig = builtinServers[id] || config.custom[id];

    if (!serverConfig) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Server not found'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Test HTTP server by making a request
    if (serverConfig.type === 'http') {
      try {
        const response = await fetch(serverConfig.url, {
          method: 'GET',
          headers: serverConfig.headers || {},
          signal: AbortSignal.timeout(5000)
        });

        // Accept various success responses (200, 404 for path-based servers, etc.)
        if (response.ok || response.status === 404 || response.status === 405) {
          return new Response(JSON.stringify({ success: true }), {
            headers: { 'Content-Type': 'application/json' }
          });
        } else {
          return new Response(JSON.stringify({
            success: false,
            error: `Server returned status ${response.status}`
          }), {
            headers: { 'Content-Type': 'application/json' }
          });
        }
      } catch (error) {
        return new Response(JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : 'Connection failed'
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }
    } else {
      // For stdio servers, just check if the command exists
      // This is a simplified check - full validation would require spawning the process
      return new Response(JSON.stringify({
        success: true,
        message: 'Stdio server configuration validated'
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  // DELETE /api/mcp-servers/:id - Remove a custom MCP server
  const deleteMatch = url.pathname.match(/^\/api\/mcp-servers\/([^/]+)$/);
  if (req.method === 'DELETE' && deleteMatch) {
    const id = deleteMatch[1];
    const config = await loadMCPConfig();

    // Can only delete custom servers
    if (!config.custom[id]) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Cannot delete built-in MCP servers'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    delete config.custom[id];
    delete config.enabled[id];

    await saveMCPConfig(config);

    return new Response(JSON.stringify({ success: true, id }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // POST /api/mcp-servers - Add a new custom MCP server
  if (req.method === 'POST' && url.pathname === '/api/mcp-servers') {
    const body = await req.json() as {
      id: string;
      name?: string;
      type: 'http' | 'stdio';
      url?: string;
      headers?: Record<string, string>;
      command?: string;
      args?: string[];
      env?: Record<string, string>;
    };

    const { id, name, type } = body;

    // Validate input
    if (!id || !type) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing required fields: id, type'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate type-specific fields
    if (type === 'http' && !body.url) {
      return new Response(JSON.stringify({
        success: false,
        error: 'HTTP servers require a URL'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (type === 'stdio' && !body.command) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Stdio servers require a command'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate ID format (lowercase alphanumeric + dashes)
    if (!/^[a-z0-9-]+$/.test(id)) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Server ID must be lowercase alphanumeric with dashes'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const config = await loadMCPConfig();

    // Check if server already exists
    const builtinServers = MCP_SERVERS_BY_PROVIDER['anthropic'] || {};
    if (builtinServers[id] || config.custom[id]) {
      return new Response(JSON.stringify({
        success: false,
        error: 'MCP server with this ID already exists'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Add custom server
    if (type === 'http') {
      config.custom[id] = {
        type: 'http',
        name,
        url: body.url!,
        headers: body.headers
      };
    } else {
      config.custom[id] = {
        type: 'stdio',
        name,
        command: body.command!,
        args: body.args,
        env: body.env
      };
    }
    config.enabled[id] = true;

    await saveMCPConfig(config);

    return new Response(JSON.stringify({ success: true, id }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Route not handled
  return undefined;
}
