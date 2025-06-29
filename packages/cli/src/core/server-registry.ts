import fsExtra from 'fs-extra';
const { readFile } = fsExtra;
import { join } from 'path';
import { existsSync } from 'fs';
import os from 'os';
import {
  MCPServer,
  ServerRegistry as ServerRegistryType,
  ValidationResult,
} from '@mcp-installer/shared';

export class ServerRegistry {
  private servers: MCPServer[] = [];

  constructor(private customRegistryPath?: string) {}

  private getRegistryPaths(): string[] {
    // If a custom path is provided, only try that
    if (this.customRegistryPath) {
      return [this.customRegistryPath];
    }

    const currentDir = process.cwd();

    return [
      // Published: User home pattern (~/.mcp-installer/servers.json)
      join(os.homedir(), '.mcp-installer', 'servers.json'),

      // Published/Development: CLI package root
      join(currentDir, 'servers.json'),

      // Development: Registry package (monorepo sibling)
      join(currentDir, '..', 'registry', 'servers.json'),

      // Development: From CLI dist/ back to registry
      join(currentDir, '..', '..', 'registry', 'servers.json'),

      // Test environment: fallback
      join(currentDir, 'registry', 'servers.json'),
    ];
  }

  async loadRegistry(): Promise<void> {
    const possiblePaths = this.getRegistryPaths();
    let lastError: Error | null = null;

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
          console.log(`Successfully loaded ${this.servers.length} servers`);
          return;
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.log(`Failed to load registry from ${registryPath}: ${errorMessage}`);
        lastError = error instanceof Error ? error : new Error(errorMessage);
        continue;
      }
    }

    // If we had a specific error (like invalid format), throw that instead of generic message
    if (lastError && lastError.message.includes('Invalid registry format')) {
      throw lastError;
    }

    throw new Error(
      `Failed to load server registry. Searched paths:\n${possiblePaths.map((p) => `  - ${p}`).join('\n')}`
    );
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
