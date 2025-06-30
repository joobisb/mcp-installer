export interface MCPServerParameter {
  type:
    | 'path'
    | 'file_path'
    | 'directory_path'
    | 'api_key'
    | 'string'
    | 'number'
    | 'boolean'
    | 'url';
  required: boolean;
  description: string;
  placeholder?: string;
  validation?: {
    pattern?: string;
    minLength?: number;
    maxLength?: number;
  };
  default?: string;
}

export interface MCPServer {
  id: string;
  name: string;
  description: string;
  category: 'development' | 'productivity' | 'database' | 'web' | 'ai' | 'utility';
  type: 'stdio' | 'http';
  difficulty: 'simple' | 'medium' | 'advanced';
  requiresAuth: boolean;
  parameters?: Record<string, MCPServerParameter>;
  installation: {
    command: string;
    args: string[];
    env?: Record<string, string>;
  };
  documentation: string;
  repository?: string;
  tags: string[];
  version?: string;
  author: string;
  validatedOn: string;
}

export interface RegistryData {
  version: string;
  lastUpdated: string;
  servers: MCPServer[];
}

// For development: use local file, for production: use API route
const REGISTRY_URL = import.meta.env.DEV
  ? 'https://api.allorigins.win/raw?url=https://raw.githubusercontent.com/joobisb/mcp-installer/main/packages/registry/servers.json'
  : '/api/registry';

// Cache for registry data
let cachedData: RegistryData | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes for webapp (shorter than CLI's 24h)

export const getServersData = async (): Promise<RegistryData> => {
  // Return cached data if still valid
  const now = Date.now();
  if (cachedData && now - cacheTimestamp < CACHE_TTL) {
    return cachedData;
  }

  try {
    console.log('Fetching registry from remote...');
    const response = await fetch(REGISTRY_URL);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = (await response.json()) as RegistryData;

    if (!data.servers || !Array.isArray(data.servers)) {
      throw new Error('Invalid registry format: missing or invalid servers array');
    }

    // Cache the data
    cachedData = data;
    cacheTimestamp = now;

    console.log(`Successfully fetched ${data.servers.length} servers from remote`);
    return data;
  } catch (error) {
    console.error('Failed to fetch registry:', error);

    // If we have cached data, return it even if stale
    if (cachedData) {
      console.log('Using stale cache as fallback');
      return cachedData;
    }

    // Final fallback - return empty registry
    console.log('No cached data available, using empty registry');
    return {
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
      servers: [],
    };
  }
};
