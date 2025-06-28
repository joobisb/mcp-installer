import fsExtra from 'fs-extra';
const { readFile } = fsExtra;
import { join } from 'path';
import { MCPServer, ServerRegistry as ServerRegistryType, ValidationResult } from '@mcp-installer/shared';

export class ServerRegistry {
  private servers: MCPServer[] = [];
  private registryPath: string;

  constructor(registryPath?: string) {
    this.registryPath = registryPath || this.getDefaultRegistryPath();
  }

  private getDefaultRegistryPath(): string {
    // In test environment, use a simple fallback
    if (process.env.NODE_ENV === 'test' || typeof jest !== 'undefined') {
      return join(process.cwd(), 'registry', 'servers.json');
    }
    
    // In production, use import.meta for proper path resolution
    try {
      // Dynamic import to avoid parsing issues
      const { fileURLToPath } = require('url');
      const { dirname } = require('path');
      
      // Use eval to avoid Jest parsing import.meta
      const importMeta = eval('import.meta');
      if (importMeta && importMeta.url) {
        const __filename = fileURLToPath(importMeta.url);
        const __dirname = dirname(__filename);
        return join(__dirname, '..', '..', '..', 'registry', 'servers.json');
      }
    } catch (error) {
      // Fallback if import.meta is not available
    }
    
    // Ultimate fallback
    return join(process.cwd(), 'registry', 'servers.json');
  }

  async loadRegistry(): Promise<void> {
    try {
      const content = await readFile(this.registryPath, 'utf-8');
      const registry: ServerRegistryType = JSON.parse(content);
      
      if (!registry.servers || !Array.isArray(registry.servers)) {
        throw new Error('Invalid registry format: missing or invalid servers array');
      }

      this.servers = registry.servers;
    } catch (error) {
      throw new Error(`Failed to load server registry: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getServer(serverId: string): Promise<MCPServer | null> {
    if (this.servers.length === 0) {
      await this.loadRegistry();
    }

    return this.servers.find(server => server.id === serverId) || null;
  }

  async getAllServers(): Promise<MCPServer[]> {
    if (this.servers.length === 0) {
      await this.loadRegistry();
    }

    return [...this.servers];
  }

  async getServersByCategory(category: MCPServer['category']): Promise<MCPServer[]> {
    const allServers = await this.getAllServers();
    return allServers.filter(server => server.category === category);
  }

  async getServersByDifficulty(difficulty: MCPServer['difficulty']): Promise<MCPServer[]> {
    const allServers = await this.getAllServers();
    return allServers.filter(server => server.difficulty === difficulty);
  }

  async searchServers(query: string): Promise<MCPServer[]> {
    const allServers = await this.getAllServers();
    const lowerQuery = query.toLowerCase();

    return allServers.filter(server => 
      server.name.toLowerCase().includes(lowerQuery) ||
      server.description.toLowerCase().includes(lowerQuery) ||
      server.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))
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
      result.warnings.push(`Server '${serverId}' requires authentication but no environment variables specified`);
    }

    if (server.installation.env) {
      for (const [key, value] of Object.entries(server.installation.env)) {
        if (value.includes('${') && value.includes('}')) {
          const envVar = value.match(/\$\{([^}]+)\}/)?.[1];
          if (envVar && !process.env[envVar]) {
            result.warnings.push(`Environment variable '${envVar}' not set for server '${serverId}'`);
          }
        }
      }
    }

    return result;
  }

  async getCategories(): Promise<MCPServer['category'][]> {
    const allServers = await this.getAllServers();
    const categories = new Set(allServers.map(server => server.category));
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

  getRegistryPath(): string {
    return this.registryPath;
  }
}