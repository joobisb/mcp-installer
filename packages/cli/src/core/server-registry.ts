import fsExtra from 'fs-extra';
const { readFile } = fsExtra;
import { join } from 'path';
import { existsSync } from 'fs';
import {
  MCPServer,
  ServerRegistry as ServerRegistryType,
  ValidationResult,
} from '@mcp-installer/shared';

export class ServerRegistry {
  private servers: MCPServer[] = [];
  private registryPath: string;

  constructor(registryPath?: string) {
    this.registryPath = registryPath || this.getDefaultRegistryPath();
  }

  private async isPublishedPackage(): Promise<boolean> {
    try {
      // In test environment, always return false (development mode)
      if (process.env.NODE_ENV === 'test' || typeof jest !== 'undefined') {
        return false;
      }

      // For runtime detection, we'll use a simpler approach
      // Check if registry-data.json exists in working directory (simpler detection)
      const workingDirPath = join(process.cwd(), 'registry-data.json');
      if (existsSync(workingDirPath)) {
        return true;
      }

      // Check relative to the current working directory for global installs
      // In global npm installs, the package structure is different
      return process.cwd().includes('node_modules');
    } catch {
      return false;
    }
  }

  private getDefaultRegistryPath(): string {
    // In test environment, use a simple fallback
    if (process.env.NODE_ENV === 'test' || typeof jest !== 'undefined') {
      return join(process.cwd(), 'registry', 'servers.json');
    }

    // For development (monorepo), use relative path to registry package
    return join(process.cwd(), '..', 'registry', 'servers.json');
  }

  private async tryLoadEmbeddedRegistry(): Promise<ServerRegistryType | null> {
    try {
      // In test environment, skip embedded registry loading
      if (process.env.NODE_ENV === 'test' || typeof jest !== 'undefined') {
        return null;
      }

      // Try multiple possible locations for the embedded registry
      const possiblePaths = [
        // In working directory (for published package)
        join(process.cwd(), 'registry-data.json'),
        // Relative to package root (alternative location)
        join(process.cwd(), '..', 'registry-data.json'),
        // In node_modules path structure
        join(process.cwd(), 'node_modules', '@mcp-installer', 'cli', 'registry-data.json'),
      ];

      for (const embeddedPath of possiblePaths) {
        if (existsSync(embeddedPath)) {
          console.log(`Loading embedded registry from: ${embeddedPath}`);
          const content = await readFile(embeddedPath, 'utf-8');
          return JSON.parse(content);
        }
      }

      console.log(`Embedded registry not found in any expected location`);
      return null;
    } catch (error) {
      console.log(
        `Failed to load embedded registry:`,
        error instanceof Error ? error.message : 'Unknown error'
      );
      return null;
    }
  }

  async loadRegistry(): Promise<void> {
    let registry: ServerRegistryType;
    const isPublished = await this.isPublishedPackage();

    console.log(`Loading registry in ${isPublished ? 'published' : 'development'} mode`);

    if (isPublished) {
      // Published package: Only try embedded registry
      try {
        const embeddedRegistry = await this.tryLoadEmbeddedRegistry();
        if (embeddedRegistry) {
          registry = embeddedRegistry;

          if (!registry.servers || !Array.isArray(registry.servers)) {
            throw new Error('Invalid embedded registry format: missing or invalid servers array');
          }

          this.servers = registry.servers;
          console.log(`Successfully loaded ${this.servers.length} servers from embedded registry`);
          return;
        }

        throw new Error('Embedded registry not found in published package');
      } catch (error) {
        throw new Error(
          `Failed to load embedded registry in published package: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    } else {
      // Development mode: Try embedded first, then fall back to file-based
      try {
        const embeddedRegistry = await this.tryLoadEmbeddedRegistry();
        if (embeddedRegistry) {
          registry = embeddedRegistry;

          if (!registry.servers || !Array.isArray(registry.servers)) {
            throw new Error('Invalid embedded registry format: missing or invalid servers array');
          }

          this.servers = registry.servers;
          console.log(`Successfully loaded ${this.servers.length} servers from embedded registry`);
          return;
        }
      } catch (error) {
        console.log('Embedded registry not available, trying file-based loading...');
      }

      // Fall back to file-based loading (development)
      try {
        console.log(`Loading registry from file: ${this.registryPath}`);
        const content = await readFile(this.registryPath, 'utf-8');
        registry = JSON.parse(content);

        if (!registry.servers || !Array.isArray(registry.servers)) {
          throw new Error('Invalid registry format: missing or invalid servers array');
        }

        this.servers = registry.servers;
        console.log(`Successfully loaded ${this.servers.length} servers from file`);
      } catch (error) {
        throw new Error(
          `Failed to load server registry from file ${this.registryPath}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }
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

  getRegistryPath(): string {
    return this.registryPath;
  }
}
