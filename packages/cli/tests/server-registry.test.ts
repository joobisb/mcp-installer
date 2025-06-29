import { vol } from 'memfs';
import { ServerRegistry } from '../src/core/server-registry';

describe('ServerRegistry', () => {
  let serverRegistry: ServerRegistry;
  const testRegistryPath = '/test/registry/servers.json';

  const mockRegistry = {
    version: '1.0.0',
    lastUpdated: '2024-12-28T00:00:00Z',
    servers: [
      {
        id: 'playwright',
        name: 'Playwright',
        description: 'Browser automation and testing',
        category: 'development' as const,
        type: 'stdio' as const,
        difficulty: 'simple' as const,
        requiresAuth: false,
        installation: {
          command: 'npx',
          args: ['@playwright/mcp@latest'],
        },
        documentation: 'https://github.com/microsoft/playwright-mcp',
        tags: ['browser', 'automation'],
      },
      {
        id: 'filesystem',
        name: 'Filesystem',
        description: 'Local file system access',
        category: 'utility' as const,
        type: 'stdio' as const,
        difficulty: 'simple' as const,
        requiresAuth: false,
        installation: {
          command: 'npx',
          args: ['-y', '@modelcontextprotocol/server-filesystem'],
        },
        documentation: 'https://github.com/modelcontextprotocol/servers',
        tags: ['files', 'local'],
      },
      {
        id: 'github',
        name: 'GitHub',
        description: 'GitHub repository management',
        category: 'development' as const,
        type: 'stdio' as const,
        difficulty: 'medium' as const,
        requiresAuth: true,
        installation: {
          command: 'npx',
          args: ['-y', '@modelcontextprotocol/server-github'],
          env: {
            GITHUB_TOKEN: '${GITHUB_TOKEN}',
          },
        },
        documentation: 'https://github.com/modelcontextprotocol/servers',
        tags: ['github', 'git'],
      },
    ],
  };

  beforeEach(() => {
    vol.reset();
    vol.fromJSON({
      [testRegistryPath]: JSON.stringify(mockRegistry),
    });
    serverRegistry = new ServerRegistry(testRegistryPath);
  });

  describe('loadRegistry', () => {
    it('should load registry successfully', async () => {
      await serverRegistry.loadRegistry();
      expect(serverRegistry.isLoaded()).toBe(true);
    });

    it('should throw error for invalid registry format', async () => {
      vol.fromJSON({
        [testRegistryPath]: JSON.stringify({ invalid: 'format' }),
      });

      await expect(serverRegistry.loadRegistry()).rejects.toThrow(
        'Invalid registry format: missing or invalid servers array'
      );
    });

    it('should throw error for invalid JSON', async () => {
      vol.fromJSON({
        [testRegistryPath]: 'invalid json',
      });

      await expect(serverRegistry.loadRegistry()).rejects.toThrow();
    });

    it('should throw error when file does not exist', async () => {
      const nonExistentRegistry = new ServerRegistry('/non/existent/path');
      await expect(nonExistentRegistry.loadRegistry()).rejects.toThrow();
    });
  });

  describe('getServer', () => {
    it('should return server by id', async () => {
      const server = await serverRegistry.getServer('playwright');

      expect(server).toBeDefined();
      expect(server?.id).toBe('playwright');
      expect(server?.name).toBe('Playwright');
    });

    it('should return null for non-existent server', async () => {
      const server = await serverRegistry.getServer('non-existent');

      expect(server).toBeNull();
    });

    it('should auto-load registry if not loaded', async () => {
      expect(serverRegistry.isLoaded()).toBe(false);

      const server = await serverRegistry.getServer('playwright');

      expect(server).toBeDefined();
      expect(serverRegistry.isLoaded()).toBe(true);
    });
  });

  describe('getAllServers', () => {
    it('should return all servers', async () => {
      const servers = await serverRegistry.getAllServers();

      expect(servers).toHaveLength(3);
      expect(servers.map((s) => s.id)).toContain('playwright');
      expect(servers.map((s) => s.id)).toContain('filesystem');
      expect(servers.map((s) => s.id)).toContain('github');
    });

    it('should return copy of servers array', async () => {
      const servers1 = await serverRegistry.getAllServers();
      const servers2 = await serverRegistry.getAllServers();

      expect(servers1).not.toBe(servers2);
      expect(servers1).toEqual(servers2);
    });
  });

  describe('getServersByCategory', () => {
    it('should return servers by category', async () => {
      const developmentServers = await serverRegistry.getServersByCategory('development');

      expect(developmentServers).toHaveLength(2);
      expect(developmentServers.map((s) => s.id)).toContain('playwright');
      expect(developmentServers.map((s) => s.id)).toContain('github');
    });

    it('should return empty array for non-existent category', async () => {
      const servers = await serverRegistry.getServersByCategory('non-existent' as any);

      expect(servers).toHaveLength(0);
    });
  });

  describe('getServersByDifficulty', () => {
    it('should return servers by difficulty', async () => {
      const simpleServers = await serverRegistry.getServersByDifficulty('simple');

      expect(simpleServers).toHaveLength(2);
      expect(simpleServers.map((s) => s.id)).toContain('playwright');
      expect(simpleServers.map((s) => s.id)).toContain('filesystem');
    });

    it('should return medium difficulty servers', async () => {
      const mediumServers = await serverRegistry.getServersByDifficulty('medium');

      expect(mediumServers).toHaveLength(1);
      expect(mediumServers[0].id).toBe('github');
    });
  });

  describe('searchServers', () => {
    it('should search by name', async () => {
      const results = await serverRegistry.searchServers('playwright');

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('playwright');
    });

    it('should search by description', async () => {
      const results = await serverRegistry.searchServers('browser');

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('playwright');
    });

    it('should search by tags', async () => {
      const results = await serverRegistry.searchServers('automation');

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('playwright');
    });

    it('should search case insensitively', async () => {
      const results = await serverRegistry.searchServers('PLAYWRIGHT');

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('playwright');
    });

    it('should return empty array for no matches', async () => {
      const results = await serverRegistry.searchServers('nonexistent');

      expect(results).toHaveLength(0);
    });
  });

  describe('validateServer', () => {
    it('should validate server successfully', async () => {
      const result = await serverRegistry.validateServer('playwright');

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return error for non-existent server', async () => {
      const result = await serverRegistry.validateServer('non-existent');

      expect(result.isValid).toBe(false);
      expect(result.errors.some((error) => error.includes('not found in registry'))).toBe(true);
    });

    it('should warn about missing environment variables', async () => {
      const result = await serverRegistry.validateServer('github');

      expect(
        result.warnings.some((warning) =>
          warning.includes("Environment variable 'GITHUB_TOKEN' not set")
        )
      ).toBe(true);
    });
  });

  describe('utility methods', () => {
    it('should return categories', async () => {
      const categories = await serverRegistry.getCategories();

      expect(categories).toContain('development');
      expect(categories).toContain('utility');
    });

    it('should return server stats', async () => {
      const stats = await serverRegistry.getServerStats();

      expect(stats.total).toBe(3);
      expect(stats.byCategory.development).toBe(2);
      expect(stats.byCategory.utility).toBe(1);
      expect(stats.byDifficulty.simple).toBe(2);
      expect(stats.byDifficulty.medium).toBe(1);
      expect(stats.requiresAuth).toBe(1);
    });

    it('should be loaded after loading registry', async () => {
      await serverRegistry.loadRegistry();
      expect(serverRegistry.isLoaded()).toBe(true);
    });
  });
});
