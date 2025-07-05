import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface MCPServer {
  id: string;
  installation: {
    command: string;
    args: string[];
    env?: Record<string, string>;
  };
}

/**
 * Generate a Cursor deep link for MCP server installation
 * @param server - The MCP server configuration
 * @returns Cursor deep link URL
 */
export function generateCursorDeepLink(server: MCPServer): string {
  // Build the configuration object
  const config = {
    command: server.installation.command,
    args: server.installation.args,
    env: server.installation.env || {},
  };

  // Convert to JSON string and encode to Base64
  const configJson = JSON.stringify(config);
  const configBase64 = btoa(configJson);

  // Generate the deep link
  return `cursor://anysphere.cursor-deeplink/mcp/install?name=${server.id}&config=${configBase64}`;
}
