/**
 * User Config API Routes
 * Handles all user configuration-related REST endpoints
 */

import { loadUserConfig, getUserDisplayName } from "../userConfig";

/**
 * Handle user config-related API routes
 * Returns Response if route was handled, undefined otherwise
 */
export async function handleUserConfigRoutes(
  req: Request,
  url: URL,
): Promise<Response | undefined> {

  // GET /api/user-config - Get user configuration
  if (url.pathname === '/api/user-config' && req.method === 'GET') {
    const config = loadUserConfig();
    const displayName = getUserDisplayName(config);

    return new Response(JSON.stringify({
      ...config,
      displayName,
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return undefined;
}
