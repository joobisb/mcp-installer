import fsExtra from 'fs-extra';
const { readFile, writeFile, ensureDir } = fsExtra;
import { join } from 'path';
import { existsSync } from 'fs';
import os from 'os';
import {
  MCPServer,
  ServerRegistry as ServerRegistryType,
  ValidationResult,
} from '@mcp-installer/shared';

interface CachedRegistry {
  data: ServerRegistryType;
  timestamp: number;
  etag?: string;
}

interface RegistryConfig {
  remoteUrl?: string;
  cacheTtlHours?: number;
  forceRefresh?: boolean;
  customRegistryPath?: string;
}

export class ServerRegistry {
  private servers: MCPServer[] = [];
  private config: RegistryConfig;
  private cacheDir: string;
  private cacheFile: string;

  // Default remote URL for published CLI
  private static readonly DEFAULT_REMOTE_URL =
    'https://raw.githubusercontent.com/joobisb/mcp-installer/main/packages/registry/servers.json';

  // Default cache TTL (24 hours)
  private static readonly DEFAULT_CACHE_TTL_HOURS = 24;

  constructor(config: RegistryConfig = {}) {
    this.config = {
      cacheTtlHours: ServerRegistry.DEFAULT_CACHE_TTL_HOURS,
      ...config,
    };

    this.cacheDir = join(os.homedir(), '.mcp-installer', 'cache');
    this.cacheFile = join(this.cacheDir, 'registry-cache.json');
  }

  private isDevelopment(): boolean {
    // Check if we're in development environment
    return (
      process.env.NODE_ENV === 'development' ||
      process.env.NODE_ENV === 'test' ||
      // Check if we're running from source (presence of packages directory)
      existsSync(join(process.cwd(), 'packages')) ||
      // Check if we're in a monorepo structure
      existsSync(join(process.cwd(), '..', 'registry', 'servers.json'))
    );
  }

  private getRegistryPaths(): string[] {
    // If a custom path is provided, only try that
    if (this.config.customRegistryPath) {
      return [this.config.customRegistryPath];
    }

    const currentDir = process.cwd();

    return [
      // Development: Registry package (monorepo sibling)
      join(currentDir, '..', 'registry', 'servers.json'),

      // Development: From CLI dist/ back to registry
      join(currentDir, '..', '..', 'registry', 'servers.json'),

      // Published/Development: CLI package root
      join(currentDir, 'servers.json'),

      // Test environment: fallback
      join(currentDir, 'registry', 'servers.json'),

      // Published: User home pattern (fallback for cached version)
      join(os.homedir(), '.mcp-installer', 'servers.json'),
    ];
  }

  private async loadFromCache(): Promise<ServerRegistryType | null> {
    try {
      if (!existsSync(this.cacheFile)) {
        return null;
      }

      const content = await readFile(this.cacheFile, 'utf-8');
      const cached: CachedRegistry = JSON.parse(content);

      // Check if cache is still valid
      const cacheAgeHours = (Date.now() - cached.timestamp) / (1000 * 60 * 60);
      const ttl = this.config.cacheTtlHours || ServerRegistry.DEFAULT_CACHE_TTL_HOURS;

      if (!this.config.forceRefresh && cacheAgeHours < ttl) {
        console.log(`Using cached registry (${Math.round(cacheAgeHours * 10) / 10}h old)`);
        return cached.data;
      }

      console.log(
        `Cache expired (${Math.round(cacheAgeHours * 10) / 10}h > ${ttl}h), fetching fresh data`
      );
      return null;
    } catch (error) {
      console.log(
        `Failed to load cache: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      return null;
    }
  }

  private async saveToCache(registry: ServerRegistryType, etag?: string): Promise<void> {
    try {
      await ensureDir(this.cacheDir);

      const cached: CachedRegistry = {
        data: registry,
        timestamp: Date.now(),
        etag,
      };

      await writeFile(this.cacheFile, JSON.stringify(cached, null, 2), 'utf-8');
      console.log('Registry cached successfully');
    } catch (error) {
      console.log(
        `Failed to cache registry: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private async fetchFromRemote(url: string): Promise<ServerRegistryType> {
    console.log(`Fetching registry from: ${url}`);

    try {
      // Try to load cached etag for conditional requests
      let etag: string | undefined;
      try {
        if (existsSync(this.cacheFile)) {
          const content = await readFile(this.cacheFile, 'utf-8');
          const cached: CachedRegistry = JSON.parse(content);
          etag = cached.etag;
        }
      } catch {
        // Ignore etag loading errors
      }

      const headers: Record<string, string> = {
        'User-Agent': 'mcp-installer-cli',
      };

      if (etag && !this.config.forceRefresh) {
        headers['If-None-Match'] = etag;
      }

      const response = await fetch(url, { headers });

      if (response.status === 304) {
        // Not modified, try to return cached version
        const cached = await this.loadFromCache();
        if (cached) {
          console.log('Remote registry not modified, using cache');
          return cached;
        }
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const content = await response.text();
      const registry: ServerRegistryType = JSON.parse(content);

      if (!registry.servers || !Array.isArray(registry.servers)) {
        throw new Error('Invalid registry format: missing or invalid servers array');
      }

      // Cache the result
      const responseEtag = response.headers.get('etag') || undefined;
      await this.saveToCache(registry, responseEtag);

      console.log(`Successfully fetched ${registry.servers.length} servers from remote`);
      return registry;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to fetch registry from ${url}: ${errorMessage}`);
    }
  }

  async loadRegistry(): Promise<void> {
    let lastError: Error | null = null;

    // In development, always try local paths first
    if (this.isDevelopment()) {
      console.log('Development environment detected, trying local paths first...');

      const possiblePaths = this.getRegistryPaths();

      for (const registryPath of possiblePaths) {
        try {
          if (existsSync(registryPath)) {
            console.log(`Loading registry from: ${registryPath}`);
            const content = await readFile(registryPath, 'utf-8');
            const registry: ServerRegistryType = JSON.parse(content);

            if (!registry.servers || !Array.isArray(registry.servers)) {
              const error = new Error('Invalid registry format: missing or invalid servers array');
              console.log(`Failed to load registry from ${registryPath}: ${error.message}`);
              lastError = error;
              continue;
            }

            this.servers = registry.servers;
            console.log(`Successfully loaded ${this.servers.length} servers from local file`);
            return;
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.log(`Failed to load registry from ${registryPath}: ${errorMessage}`);
          lastError = error instanceof Error ? error : new Error(errorMessage);
          continue;
        }
      }

      console.log('No local registry found in development, falling back to remote...');
    }

    // Try remote fetch (for production or when local files not found in development)
    const remoteUrl = this.config.remoteUrl || ServerRegistry.DEFAULT_REMOTE_URL;

    try {
      // Try cache first (unless force refresh)
      if (!this.config.forceRefresh) {
        const cached = await this.loadFromCache();
        if (cached) {
          this.servers = cached.servers;
          return;
        }
      }

      // Fetch from remote
      const registry = await this.fetchFromRemote(remoteUrl);
      this.servers = registry.servers;
      return;
    } catch (remoteError) {
      console.log(
        `Remote fetch failed: ${remoteError instanceof Error ? remoteError.message : 'Unknown error'}`
      );
      lastError = remoteError instanceof Error ? remoteError : new Error(String(remoteError));

      // Try to use stale cache as last resort
      try {
        const content = await readFile(this.cacheFile, 'utf-8');
        const cached: CachedRegistry = JSON.parse(content);
        console.log('Using stale cache as fallback');
        this.servers = cached.data.servers;
        return;
      } catch {
        // Cache also failed
      }
    }

    // If we had a specific error (like invalid format), throw that instead of generic message
    if (lastError && lastError.message.includes('Invalid registry format')) {
      throw lastError;
    }

    // Final fallback - try local paths even in production
    if (!this.isDevelopment()) {
      console.log('Remote and cache failed, trying local fallback paths...');
      const possiblePaths = this.getRegistryPaths();

      for (const registryPath of possiblePaths) {
        try {
          if (existsSync(registryPath)) {
            console.log(`Loading registry from fallback: ${registryPath}`);
            const content = await readFile(registryPath, 'utf-8');
            const registry: ServerRegistryType = JSON.parse(content);

            if (registry.servers && Array.isArray(registry.servers)) {
              this.servers = registry.servers;
              console.log(`Successfully loaded ${this.servers.length} servers from fallback`);
              return;
            }
          }
        } catch {
          // Continue to next path
        }
      }
    }

    throw new Error(
      `Failed to load server registry from all sources:\n` +
        `- Remote URL: ${remoteUrl}\n` +
        `- Cache: ${this.cacheFile}\n` +
        `- Local paths: ${this.getRegistryPaths().join(', ')}`
    );
  }

  async refreshRegistry(): Promise<void> {
    console.log('Force refreshing registry...');
    this.config.forceRefresh = true;
    this.servers = []; // Clear current servers to force reload
    await this.loadRegistry();
    this.config.forceRefresh = false; // Reset flag
  }

  async clearCache(): Promise<void> {
    try {
      if (existsSync(this.cacheFile)) {
        await fsExtra.remove(this.cacheFile);
        console.log('Registry cache cleared');
      }
    } catch (error) {
      console.log(
        `Failed to clear cache: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  getCacheInfo(): { exists: boolean; path: string; age?: number; size?: number } {
    const info = {
      exists: existsSync(this.cacheFile),
      path: this.cacheFile,
      age: undefined as number | undefined,
      size: undefined as number | undefined,
    };

    if (info.exists) {
      try {
        const stats = fsExtra.statSync(this.cacheFile);
        info.age = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60); // hours
        info.size = stats.size;
      } catch {
        // Ignore stat errors
      }
    }

    return info;
  }

  async getServer(serverId: string): Promise<MCPServer | null> {
    if (this.servers.length === 0) {
      await this.loadRegistry();
    }

    return this.servers.find((server) => server.id === serverId) || null;
  }

  async getAllServers(): Promise<MCPServer[]> {
    if (this.servers.length === 0) {
      await this.loadRegistry();
    }

    return [...this.servers];
  }

  async getServersByCategory(category: MCPServer['category']): Promise<MCPServer[]> {
    const allServers = await this.getAllServers();
    return allServers.filter((server) => server.category === category);
  }

  async getServersByDifficulty(difficulty: MCPServer['difficulty']): Promise<MCPServer[]> {
    const allServers = await this.getAllServers();
    return allServers.filter((server) => server.difficulty === difficulty);
  }

  async searchServers(query: string): Promise<MCPServer[]> {
    const allServers = await this.getAllServers();
    const lowerQuery = query.toLowerCase();

    return allServers.filter(
      (server) =>
        server.name.toLowerCase().includes(lowerQuery) ||
        server.description.toLowerCase().includes(lowerQuery) ||
        server.tags?.some((tag: string) => tag.toLowerCase().includes(lowerQuery))
    );
  }

  async validateServer(serverId: string): Promise<ValidationResult> {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
    };

    const server = await this.getServer(serverId);

    if (!server) {
      result.isValid = false;
      result.errors.push(`Server '${serverId}' not found in registry`);
      return result;
    }

    if (!server.installation.command) {
      result.isValid = false;
      result.errors.push(`Server '${serverId}' missing installation command`);
    }

    if (!Array.isArray(server.installation.args)) {
      result.isValid = false;
      result.errors.push(`Server '${serverId}' installation args must be an array`);
    }

    if (server.requiresAuth && !server.installation.env) {
      result.warnings.push(
        `Server '${serverId}' requires authentication but no environment variables specified`
      );
    }

    if (server.installation.env) {
      for (const value of Object.values(server.installation.env)) {
        if (value.includes('${') && value.includes('}')) {
          const envVar = value.match(/\$\{([^}]+)\}/)?.[1];
          if (envVar && !process.env[envVar]) {
            result.warnings.push(
              `Environment variable '${envVar}' not set for server '${serverId}'`
            );
          }
        }
      }
    }

    return result;
  }

  async getCategories(): Promise<MCPServer['category'][]> {
    const allServers = await this.getAllServers();
    const categories = new Set(allServers.map((server) => server.category));
    return Array.from(categories);
  }

  async getServerStats(): Promise<{
    total: number;
    byCategory: Record<string, number>;
    byDifficulty: Record<string, number>;
    requiresAuth: number;
  }> {
    const allServers = await this.getAllServers();

    const byCategory: Record<string, number> = {};
    const byDifficulty: Record<string, number> = {};
    let requiresAuth = 0;

    for (const server of allServers) {
      byCategory[server.category] = (byCategory[server.category] || 0) + 1;
      byDifficulty[server.difficulty] = (byDifficulty[server.difficulty] || 0) + 1;
      if (server.requiresAuth) requiresAuth++;
    }

    return {
      total: allServers.length,
      byCategory,
      byDifficulty,
      requiresAuth,
    };
  }

  isLoaded(): boolean {
    return this.servers.length > 0;
  }
}
