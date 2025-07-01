import { vol } from 'memfs';
import { ClientManager } from '../src/core/client-manager';

describe('ClientManager', () => {
  let clientManager: ClientManager;

  beforeEach(() => {
    vol.reset();
    clientManager = new ClientManager();
  });

  describe('detectInstalledClients', () => {
    it('should detect Claude Desktop when config exists', async () => {
      vol.fromJSON({
        '/Users/test/Library/Application Support/Claude/claude_desktop_config.json': JSON.stringify(
          {
            mcpServers: {},
          }
        ),
      });

      const clients = await clientManager.detectInstalledClients();
      const claudeClient = clients.find((c) => c.type === 'claude-desktop');

      expect(claudeClient).toBeDefined();
      expect(claudeClient?.isInstalled).toBe(true);
      expect(claudeClient?.configPath).toContain('claude_desktop_config.json');
    });

    it('should detect Cursor when config exists', async () => {
      vol.fromJSON({
        '/Users/test/.cursor/mcp.json': JSON.stringify({
          mcpServers: {},
        }),
      });

      const clients = await clientManager.detectInstalledClients();
      const cursorClient = clients.find((c) => c.type === 'cursor');

      expect(cursorClient).toBeDefined();
      expect(cursorClient?.isInstalled).toBe(true);
      expect(cursorClient?.configPath).toContain('.cursor/mcp.json');
    });

    it('should detect Gemini when config exists', async () => {
      vol.fromJSON({
        '/Users/test/.gemini/settings.json': JSON.stringify({
          mcpServers: {},
        }),
      });

      const clients = await clientManager.detectInstalledClients();
      const geminiClient = clients.find((c) => c.type === 'gemini');

      expect(geminiClient).toBeDefined();
      expect(geminiClient?.isInstalled).toBe(true);
      expect(geminiClient?.configPath).toContain('.gemini/settings.json');
    });

    it('should not detect clients when no configs exist', async () => {
      const clients = await clientManager.detectInstalledClients();

      clients.forEach((client) => {
        expect(client.isInstalled).toBe(false);
      });
    });

    it('should return all supported client types', async () => {
      const clients = await clientManager.detectInstalledClients();
      const clientTypes = clients.map((c) => c.type);

      expect(clientTypes).toContain('claude-desktop');
      expect(clientTypes).toContain('cursor');
      expect(clientTypes).toContain('gemini');
      expect(clientTypes).toContain('claude-code');
    });
  });

  describe('detectClient', () => {
    it('should detect specific client correctly', async () => {
      vol.fromJSON({
        '/Users/test/.cursor/mcp.json': JSON.stringify({ mcpServers: {} }),
      });

      const client = await clientManager.detectClient('cursor');

      expect(client.type).toBe('cursor');
      expect(client.isInstalled).toBe(true);
      expect(client.name).toBe('Cursor');
    });

    it('should handle non-existent client type', async () => {
      const client = await clientManager.detectClient('invalid-client' as any);

      expect(client.type).toBe('invalid-client');
      expect(client.isInstalled).toBe(false);
      expect(client.configPath).toBe('');
    });
  });

  describe('utility methods', () => {
    it('should return supported clients', () => {
      const supportedClients = clientManager.getSupportedClients();

      expect(Array.isArray(supportedClients)).toBe(true);
      expect(supportedClients.length).toBeGreaterThan(0);
      expect(supportedClients).toContain('cursor');
      expect(supportedClients).toContain('gemini');
      expect(supportedClients).toContain('claude-desktop');
    });

    it('should validate client support', () => {
      expect(clientManager.isClientSupported('cursor')).toBe(true);
      expect(clientManager.isClientSupported('gemini')).toBe(true);
      expect(clientManager.isClientSupported('invalid-client')).toBe(false);
    });

    it('should get config path for supported clients', () => {
      const cursorPath = clientManager.getConfigPath('cursor');
      expect(cursorPath).toContain('.cursor/mcp.json');

      const geminiPath = clientManager.getConfigPath('gemini');
      expect(geminiPath).toContain('.gemini/settings.json');
    });

    it('should get config path for claude-code', () => {
      const claudeCodePath = clientManager.getConfigPath('claude-code');
      expect(claudeCodePath).toContain('.claude.json');
    });

    it('should throw error for unsupported client config path', () => {
      expect(() => {
        clientManager.getConfigPath('invalid-client' as any);
      }).toThrow();
    });
  });
});
