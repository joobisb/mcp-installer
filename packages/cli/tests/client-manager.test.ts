import '@jest/globals';
import { vol } from 'memfs';
import { ClientManager } from '../src/core/client-manager';

describe('ClientManager', () => {

  describe("initialization and state management", () => {
    it("should create new instances independently", () => {
      const manager1 = new ClientManager();
      const manager2 = new ClientManager();
      
      expect(manager1).not.toBe(manager2);
      expect(manager1.getSupportedClients()).toEqual(manager2.getSupportedClients());
    });

    it("should maintain consistent supported clients list", () => {
      const clients1 = clientManager.getSupportedClients();
      const clients2 = clientManager.getSupportedClients();
      
      expect(clients1).toEqual(clients2);
      expect(clients1).toHaveLength(clients2.length);
    });

    it("should handle case-sensitive client type validation", () => {
      expect(clientManager.isClientSupported("CURSOR")).toBe(false);
      expect(clientManager.isClientSupported("Cursor")).toBe(false);
      expect(clientManager.isClientSupported("cursor")).toBe(true);
    });

    it("should validate all supported client types", () => {
      const supportedClients = clientManager.getSupportedClients();
      const expectedClients = ["claude-desktop", "cursor", "gemini", "claude-code", "vscode"];
      
      expectedClients.forEach(clientType => {
        expect(supportedClients).toContain(clientType);
        expect(clientManager.isClientSupported(clientType)).toBe(true);
      });
    });

    it("should handle empty and whitespace client type validation", () => {
      expect(clientManager.isClientSupported("")).toBe(false);
      expect(clientManager.isClientSupported("  ")).toBe(false);
      expect(clientManager.isClientSupported("\t")).toBe(false);
      expect(clientManager.isClientSupported("\n")).toBe(false);
    });

    it("should handle null and undefined client type validation", () => {
      expect(clientManager.isClientSupported(null as any)).toBe(false);
      expect(clientManager.isClientSupported(undefined as any)).toBe(false);
    });

    it("should return correct ClientInfo interface structure", async () => {
      vol.fromJSON({
        "/Users/test/.cursor/mcp.json": JSON.stringify({ mcpServers: {} }),
      });

      const client = await clientManager.detectClient("cursor");

      // Verify the returned object matches ClientInfo interface
      expect(client).toHaveProperty("type");
      expect(client).toHaveProperty("name");
      expect(client).toHaveProperty("configPath");
      expect(client).toHaveProperty("isInstalled");
      expect(client).toHaveProperty("configExists");
      
      expect(typeof client.type).toBe("string");
      expect(typeof client.name).toBe("string");
      expect(typeof client.configPath).toBe("string");
      expect(typeof client.isInstalled).toBe("boolean");
      expect(typeof client.configExists).toBe("boolean");
    });
  });

  let clientManager: ClientManager;

  beforeEach(() => {

    describe("performance and stress tests", () => {
      it("should handle detection with many config files efficiently", async () => {
        // Create multiple config files
        const configFiles = {};
        for (let i = 0; i < 50; i++) {
          configFiles[`/Users/test/.cursor/mcp${i}.json`] = JSON.stringify({ mcpServers: {} });
        }
        configFiles["/Users/test/.cursor/mcp.json"] = JSON.stringify({ mcpServers: {} });
        vol.fromJSON(configFiles);

        const startTime = Date.now();
        const client = await clientManager.detectClient("cursor");
        const endTime = Date.now();

        expect(client.isInstalled).toBe(true);
        expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
      });

      it("should handle rapid successive calls without race conditions", async () => {
        vol.fromJSON({
          "/Users/test/.cursor/mcp.json": JSON.stringify({ mcpServers: {} }),
        });

        const calls = [];
        for (let i = 0; i < 20; i++) {
          calls.push(clientManager.detectClient("cursor"));
        }

        const results = await Promise.all(calls);
        results.forEach(client => {
          expect(client.type).toBe("cursor");
          expect(client.isInstalled).toBe(true);
        });
      });

      it("should handle detection across all client types efficiently", async () => {
        vol.fromJSON({
          "/Users/test/.cursor/mcp.json": JSON.stringify({ mcpServers: {} }),
          "/Users/test/.gemini/settings.json": JSON.stringify({ mcpServers: {} }),
          "/Users/test/Library/Application Support/Claude/claude_desktop_config.json": JSON.stringify({ mcpServers: {} }),
          "/Users/test/.vscode/mcp.json": JSON.stringify({ servers: {} }),
          "/Users/test/.claude.json": JSON.stringify({ mcpServers: {} }),
        });

        const startTime = Date.now();
        const clients = await clientManager.detectInstalledClients();
        const endTime = Date.now();

        expect(clients.length).toBe(5);
        expect(endTime - startTime).toBeLessThan(2000); // Should complete within 2 seconds
      });
    });

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
      // Mock execSync to simulate no commands found
      const mockExecSync = jest.spyOn(require('child_process'), 'execSync');
      mockExecSync.mockImplementation(() => {
        throw new Error('Command not found');
      });

      const clients = await clientManager.detectInstalledClients();

      clients.forEach((client) => {
        expect(client.isInstalled).toBe(false);
      });

      mockExecSync.mockRestore();
    });

    it('should return all supported client types', async () => {

      describe("comprehensive client type testing", () => {
        it("should detect VSCode when config exists in .vscode directory", async () => {
          vol.fromJSON({
            "/Users/test/.vscode/mcp.json": JSON.stringify({
              servers: {}
            }),
          });

          const client = await clientManager.detectClient("vscode");
          expect(client.type).toBe("vscode");
          expect(client.isInstalled).toBe(true);
          expect(client.name).toBe("Visual Studio Code");
        });

        it("should detect Claude Code when config exists", async () => {
          vol.fromJSON({
            "/Users/test/.claude.json": JSON.stringify({
              mcpServers: {}
            }),
          });

          const client = await clientManager.detectClient("claude-code");
          expect(client.type).toBe("claude-code");
          expect(client.isInstalled).toBe(true);
          expect(client.name).toBe("Claude Code");
        });

        it("should handle detection of all clients when multiple configs exist", async () => {
          vol.fromJSON({
            "/Users/test/.cursor/mcp.json": JSON.stringify({ mcpServers: {} }),
            "/Users/test/.gemini/settings.json": JSON.stringify({ mcpServers: {} }),
            "/Users/test/Library/Application Support/Claude/claude_desktop_config.json": JSON.stringify({ mcpServers: {} }),
            "/Users/test/.vscode/mcp.json": JSON.stringify({ servers: {} }),
            "/Users/test/.claude.json": JSON.stringify({ mcpServers: {} }),
          });

          const clients = await clientManager.detectInstalledClients();
          
          const installedClients = clients.filter(c => c.isInstalled);
          expect(installedClients.length).toBe(5);
          
          const clientTypes = installedClients.map(c => c.type);
          expect(clientTypes).toContain("cursor");
          expect(clientTypes).toContain("gemini");
          expect(clientTypes).toContain("claude-desktop");
          expect(clientTypes).toContain("vscode");
          expect(clientTypes).toContain("claude-code");
        });

        it("should return consistent client information across detection methods", async () => {
          vol.fromJSON({
            "/Users/test/.cursor/mcp.json": JSON.stringify({ mcpServers: {} }),
          });

          const singleClient = await clientManager.detectClient("cursor");
          const allClients = await clientManager.detectInstalledClients();
          const cursorFromAll = allClients.find(c => c.type === "cursor");

          expect(singleClient.type).toBe(cursorFromAll?.type);
          expect(singleClient.isInstalled).toBe(cursorFromAll?.isInstalled);
          expect(singleClient.configPath).toBe(cursorFromAll?.configPath);
          expect(singleClient.name).toBe(cursorFromAll?.name);
          expect(singleClient.configExists).toBe(cursorFromAll?.configExists);
        });

        it("should handle clients with detect commands vs config-only detection", async () => {
          // Mock execSync for clients with detect commands
          const mockExecSync = jest.spyOn(require("child_process"), "execSync");
          mockExecSync.mockImplementation((cmd) => {
            if (cmd.includes("cursor")) {
              return "cursor found";
            }
            throw new Error("Command not found");
          });

          vol.fromJSON({
            "/Users/test/.cursor/mcp.json": JSON.stringify({ mcpServers: {} }),
            "/Users/test/.gemini/settings.json": JSON.stringify({ mcpServers: {} }),
          });

          const cursorClient = await clientManager.detectClient("cursor");
          const geminiClient = await clientManager.detectClient("gemini");

          expect(cursorClient.isInstalled).toBe(true); // Detected via command and config
          expect(geminiClient.isInstalled).toBe(true); // Detected via config only

          mockExecSync.mockRestore();
        });

        it("should detect clients via command even without config files", async () => {
          // Mock execSync to find commands
          const mockExecSync = jest.spyOn(require("child_process"), "execSync");
          mockExecSync.mockImplementation((cmd) => {
            if (cmd.includes("code")) {
              return "/usr/local/bin/code";
            }
            throw new Error("Command not found");
          });

          // No config files exist
          vol.fromJSON({});

          const vscodeClient = await clientManager.detectClient("vscode");
          expect(vscodeClient.isInstalled).toBe(true); // Detected via command
          expect(vscodeClient.configExists).toBe(false); // No config file

          mockExecSync.mockRestore();
        });

        it("should handle VSCode with multiple potential config paths", async () => {
          // VSCode has multiple config paths - test prioritization
          vol.fromJSON({
            "/Users/test/Library/Application Support/Code/User/mcp.json": JSON.stringify({ servers: { server1: {} } }),
            "/Users/test/.vscode/mcp.json": JSON.stringify({ servers: { server2: {} } }),
          });

          const client = await clientManager.detectClient("vscode");
          expect(client.isInstalled).toBe(true);
          expect(client.configExists).toBe(true);
          // Should use the first path found (macOS Application Support)
          expect(client.configPath).toContain("Library/Application Support/Code/User/mcp.json");
        });
      });

      const clients = await clientManager.detectInstalledClients();
      const clientTypes = clients.map((c) => c.type);

      expect(clientTypes).toContain('claude-desktop');
      expect(clientTypes).toContain('cursor');
      expect(clientTypes).toContain('gemini');
      expect(clientTypes).toContain('claude-code');
      expect(clientTypes).toContain('vscode');
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

    describe("error handling and edge cases", () => {
      it("should handle file system errors gracefully during detection", async () => {
        // Mock existsSync to throw an error
        const mockExistsSync = jest.spyOn(require("fs"), "existsSync");
        mockExistsSync.mockImplementation(() => {
          throw new Error("File system error");
        });

        const clients = await clientManager.detectInstalledClients();
        
        // Should still return client objects but with isInstalled=false
        expect(Array.isArray(clients)).toBe(true);
        clients.forEach(client => {
          expect(client.isInstalled).toBe(false);
        });

        mockExistsSync.mockRestore();
      });

      it("should handle corrupted config files gracefully", async () => {
        vol.fromJSON({
          "/Users/test/Library/Application Support/Claude/claude_desktop_config.json": "invalid json content",
        });

        // Mock existsSync to return true for corrupted file
        const mockExistsSync = jest.spyOn(require("fs"), "existsSync");
        mockExistsSync.mockReturnValue(true);

        const client = await clientManager.detectClient("claude-desktop");
        expect(client.type).toBe("claude-desktop");
        expect(client.configExists).toBe(true);
        expect(client.isInstalled).toBe(true);

        mockExistsSync.mockRestore();
      });

      it("should handle empty config files", async () => {
        vol.fromJSON({
          "/Users/test/.cursor/mcp.json": "",
        });

        const client = await clientManager.detectClient("cursor");
        expect(client.type).toBe("cursor");
        expect(client.configExists).toBe(true);
      });

      it("should handle symlinked config directories", async () => {
        vol.fromJSON({
          "/Users/test/.cursor/mcp.json": JSON.stringify({ mcpServers: {} }),
          "/Users/test/symlink-target/.cursor/mcp.json": JSON.stringify({ mcpServers: {} }),
        });

        const client = await clientManager.detectClient("cursor");
        expect(client.isInstalled).toBe(true);
        expect(client.configExists).toBe(true);
      });

      it("should handle very large config files", async () => {
        const largeConfig: any = { mcpServers: {} };
        for (let i = 0; i < 100; i++) {
          largeConfig[`server${i}`] = {
            command: "node",
            args: [`arg${i}`.repeat(50)]
          };
        }

        vol.fromJSON({
          "/Users/test/.cursor/mcp.json": JSON.stringify(largeConfig),
        });

        const client = await clientManager.detectClient("cursor");
        expect(client.isInstalled).toBe(true);
        expect(client.configExists).toBe(true);
      });

      it("should handle dynamic imports failure gracefully", async () => {
        // Mock path module import to fail
        const originalRequire = require;
        const mockRequire = jest.fn((module) => {
          if (module === "path") {
            throw new Error("Import failed");
          }
          return originalRequire(module);
        });
        
        (global as any).require = mockRequire;

        try {
          const client = await clientManager.detectClient("cursor");
          expect(client.type).toBe("cursor");
          expect(client.isInstalled).toBe(false);
        } finally {
          (global as any).require = originalRequire;
        }
      });
    });

    describe("config path validation and resolution", () => {
      it("should handle special characters in home directory path", () => {
        const originalHomedir = require("os").homedir;
        require("os").homedir = jest.fn(() => "/Users/test user with spaces & symbols");

        try {
          const cursorPath = clientManager.getConfigPath("cursor");
          expect(cursorPath).toContain("test user with spaces & symbols/.cursor/mcp.json");
        } finally {
          require("os").homedir = originalHomedir;
        }
      });

      it("should handle missing HOME environment variable", () => {
        const originalHomedir = require("os").homedir;
        require("os").homedir = jest.fn(() => {
          throw new Error("HOME not found");
        });

        try {
          expect(() => {
            clientManager.getConfigPath("cursor");
          }).toThrow();
        } finally {
          require("os").homedir = originalHomedir;
        }
      });

      it("should validate all supported client config paths", () => {
        const supportedClients = clientManager.getSupportedClients();
        
        supportedClients.forEach(clientType => {
          expect(() => {
            const path = clientManager.getConfigPath(clientType);
            expect(typeof path).toBe("string");
            expect(path.length).toBeGreaterThan(0);
          }).not.toThrow();
        });
      });

      it("should handle multiple config paths for clients", async () => {
        // Test claude-desktop which has multiple config paths
        vol.fromJSON({
          "/Users/test/.claude/claude_desktop_config.json": JSON.stringify({ mcpServers: {} }),
        });

        const client = await clientManager.detectClient("claude-desktop");
        expect(client.isInstalled).toBe(true);
        expect(client.configExists).toBe(true);
        expect(client.configPath).toContain("claude_desktop_config.json");
      });

      it("should prioritize first found config path", async () => {
        // Create configs in multiple paths for claude-desktop
        vol.fromJSON({
          "/Users/test/Library/Application Support/Claude/claude_desktop_config.json": JSON.stringify({ mcpServers: { server1: {} } }),
          "/Users/test/.claude/claude_desktop_config.json": JSON.stringify({ mcpServers: { server2: {} } }),
        });

        const client = await clientManager.detectClient("claude-desktop");
        expect(client.isInstalled).toBe(true);
        expect(client.configExists).toBe(true);
        // Should use the first path found (macOS Application Support)
        expect(client.configPath).toContain("Library/Application Support/Claude");
      });

      it("should return primary config path even when no config exists", async () => {
        // No config files exist
        vol.fromJSON({});

        const client = await clientManager.detectClient("claude-desktop");
        expect(client.configPath).toContain("Library/Application Support/Claude/claude_desktop_config.json");
        expect(client.isInstalled).toBe(false);
        expect(client.configExists).toBe(false);
      });
    });

    describe("concurrent detection operations", () => {
      it("should handle multiple simultaneous detectClient calls", async () => {
        vol.fromJSON({
          "/Users/test/.cursor/mcp.json": JSON.stringify({ mcpServers: {} }),
          "/Users/test/.gemini/settings.json": JSON.stringify({ mcpServers: {} }),
          "/Users/test/Library/Application Support/Claude/claude_desktop_config.json": JSON.stringify({ mcpServers: {} }),
        });

        const promises = [
          clientManager.detectClient("cursor"),
          clientManager.detectClient("gemini"),
          clientManager.detectClient("claude-desktop"),
        ];

        const results = await Promise.all(promises);
        
        expect(results).toHaveLength(3);
        results.forEach(client => {
          expect(client.isInstalled).toBe(true);
          expect(client.configExists).toBe(true);
        });
      });

      it("should handle multiple simultaneous detectInstalledClients calls", async () => {
        vol.fromJSON({
          "/Users/test/.cursor/mcp.json": JSON.stringify({ mcpServers: {} }),
        });

        const promises = [
          clientManager.detectInstalledClients(),
          clientManager.detectInstalledClients(),
          clientManager.detectInstalledClients(),
        ];

        const results = await Promise.all(promises);
        
        expect(results).toHaveLength(3);
        results.forEach(clients => {
          expect(Array.isArray(clients)).toBe(true);
          const cursorClient = clients.find(c => c.type === "cursor");
          expect(cursorClient?.isInstalled).toBe(true);
        });
      });
    });

    it('should return supported clients', () => {
      const supportedClients = clientManager.getSupportedClients();

      expect(Array.isArray(supportedClients)).toBe(true);
      expect(supportedClients.length).toBeGreaterThan(0);
      expect(supportedClients).toContain('cursor');
      expect(supportedClients).toContain('gemini');
      expect(supportedClients).toContain('claude-desktop');
      expect(supportedClients).toContain('vscode');
    });

    it('should validate client support', () => {
      expect(clientManager.isClientSupported('cursor')).toBe(true);
      expect(clientManager.isClientSupported('gemini')).toBe(true);
      expect(clientManager.isClientSupported('vscode')).toBe(true);
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

    it("should get client configuration for supported clients", () => {
      const cursorConfig = clientManager.getClientConfig("cursor");
      expect(cursorConfig).toBeDefined();
      expect(cursorConfig.name).toBe("Cursor");
      expect(cursorConfig.configPaths).toContain(expect.stringContaining(".cursor/mcp.json"));
      expect(cursorConfig.detectCommand).toBe("cursor");
      expect(cursorConfig.autoCreateConfig).toBe(true);
      expect(cursorConfig.configTemplate).toEqual({ mcpServers: {} });
    });

    it("should get client configuration for claude-desktop", () => {
      const claudeConfig = clientManager.getClientConfig("claude-desktop");
      expect(claudeConfig).toBeDefined();
      expect(claudeConfig.name).toBe("Claude Desktop");
      expect(claudeConfig.configPaths.length).toBeGreaterThan(1); // Multiple paths
      expect(claudeConfig.autoCreateConfig).toBe(true);
      expect(claudeConfig.configTemplate).toEqual({ mcpServers: {} });
    });

    it("should get client configuration for vscode with different template", () => {
      const vscodeConfig = clientManager.getClientConfig("vscode");
      expect(vscodeConfig).toBeDefined();
      expect(vscodeConfig.name).toBe("Visual Studio Code");
      expect(vscodeConfig.detectCommand).toBe("code");
      expect(vscodeConfig.configTemplate).toEqual({ servers: {} }); // Different from mcpServers
    });

    it("should get client configuration for gemini without autoCreateConfig", () => {
      const geminiConfig = clientManager.getClientConfig("gemini");
      expect(geminiConfig).toBeDefined();
      expect(geminiConfig.name).toBe("Gemini");
      expect(geminiConfig.detectCommand).toBe("gemini");
      expect(geminiConfig.autoCreateConfig).toBeUndefined(); // No auto-create for gemini
      expect(geminiConfig.configTemplate).toEqual({ mcpServers: {} });
    });

    it("should get client configuration for claude-code", () => {
      const claudeCodeConfig = clientManager.getClientConfig("claude-code");
      expect(claudeCodeConfig).toBeDefined();
      expect(claudeCodeConfig.name).toBe("Claude Code");
      expect(claudeCodeConfig.detectCommand).toBe("claude");
      expect(claudeCodeConfig.autoCreateConfig).toBeUndefined(); // No auto-create for claude-code
    });

    it("should return undefined for unsupported client configuration", () => {
      const invalidConfig = clientManager.getClientConfig("invalid-client" as any);
      expect(invalidConfig).toBeUndefined();
    });
  });

  describe('auto-config creation', () => {
    it('should auto-create cursor config when directory exists but file does not', async () => {
      // Setup: .cursor directory exists but mcp.json doesn't
      vol.fromJSON({
        '/Users/test/.cursor/': null, // Directory exists but empty
      });

      // Mock execSync to simulate cursor command not found
      const mockExecSync = jest.spyOn(require('child_process'), 'execSync');
      mockExecSync.mockImplementation(() => {
        throw new Error('Command not found');
      });

      const client = await clientManager.detectClient('cursor');

      expect(client.type).toBe('cursor');
      expect(client.isInstalled).toBe(true); // Config exists, so considered installed
      expect(client.configExists).toBe(true); // Config was auto-created
      expect(client.configPath).toContain('.cursor/mcp.json');

      // Verify the config file was created with the correct template
      const configContent = vol.readFileSync('/Users/test/.cursor/mcp.json', 'utf-8') as string;
      const config = JSON.parse(configContent);
      expect(config).toEqual({
        mcpServers: {},
      });

      mockExecSync.mockRestore();
    });

    it('should not auto-create config for clients without autoCreateConfig', async () => {
      // Setup: .gemini directory exists but config doesn't
      vol.fromJSON({
        '/Users/test/.gemini/': null, // Directory exists but empty
      });

      // Mock execSync to simulate gemini command not found
      const mockExecSync = jest.spyOn(require('child_process'), 'execSync');
      mockExecSync.mockImplementation(() => {
        throw new Error('Command not found');
      });

      const client = await clientManager.detectClient('gemini');

      expect(client.type).toBe('gemini');
      expect(client.isInstalled).toBe(false);
      expect(client.configExists).toBe(false); // No auto-creation for gemini

      mockExecSync.mockRestore();
    });

    it('should not auto-create config when parent directory does not exist', async () => {
      // Setup: No .cursor directory exists
      vol.fromJSON({
        '/Users/test/': null, // Only home directory exists
      });

      // Mock execSync to simulate cursor command not found
      const mockExecSync = jest.spyOn(require('child_process'), 'execSync');
      mockExecSync.mockImplementation(() => {
        throw new Error('Command not found');
      });

      const client = await clientManager.detectClient('cursor');
      expect(client.type).toBe('cursor');
      expect(client.isInstalled).toBe(false);
      expect(client.configExists).toBe(false); // No auto-creation when dir doesn't exist

      mockExecSync.mockRestore();
    });

    it("should handle auto-config creation with write permission errors", async () => {
      vol.fromJSON({
        "/Users/test/.cursor/": null,
      });

      // Mock writeFileSync to fail with permission error
      const mockWriteFileSync = jest.spyOn(require("fs"), "writeFileSync");
      mockWriteFileSync.mockImplementation(() => {
        const error = new Error("EACCES: permission denied");
        (error as any).code = "EACCES";
        throw error;
      });

      const mockExecSync = jest.spyOn(require("child_process"), "execSync");
      mockExecSync.mockImplementation(() => {
        throw new Error("Command not found");
      });

      const client = await clientManager.detectClient("cursor");
      
      expect(client.type).toBe("cursor");
      expect(client.isInstalled).toBe(false);
      expect(client.configExists).toBe(false);

      mockWriteFileSync.mockRestore();
      mockExecSync.mockRestore();
    });

    it("should verify auto-created config template structure", async () => {
      vol.fromJSON({
        "/Users/test/.cursor/": null,
      });

      const mockExecSync = jest.spyOn(require("child_process"), "execSync");
      mockExecSync.mockImplementation(() => {
        throw new Error("Command not found");
      });

      const client = await clientManager.detectClient("cursor");
      
      expect(client.configExists).toBe(true);
      
      // Verify the auto-created config matches the template
      const configContent = vol.readFileSync("/Users/test/.cursor/mcp.json", "utf-8") as string;
      const config = JSON.parse(configContent);
      const expectedTemplate = clientManager.getClientConfig("cursor").configTemplate;
      expect(config).toEqual(expectedTemplate);

      mockExecSync.mockRestore();
    });

    it("should not auto-create config for clients without autoCreateConfig flag", async () => {
      vol.fromJSON({
        "/Users/test/.gemini/": null,
      });

      const mockExecSync = jest.spyOn(require("child_process"), "execSync");
      mockExecSync.mockImplementation(() => {
        throw new Error("Command not found");
      });

      const client = await clientManager.detectClient("gemini");
      
      expect(client.type).toBe("gemini");
      expect(client.isInstalled).toBe(false);
      expect(client.configExists).toBe(false);
      // Verify no config file was created
      expect(vol.existsSync("/Users/test/.gemini/settings.json")).toBe(false);

      mockExecSync.mockRestore();
    });

    it("should auto-create config for claude-desktop with correct template", async () => {
      vol.fromJSON({
        "/Users/test/Library/Application Support/Claude/": null,
      });

      const mockExecSync = jest.spyOn(require("child_process"), "execSync");
      mockExecSync.mockImplementation(() => {
        throw new Error("Command not found");
      });

      const client = await clientManager.detectClient("claude-desktop");
      
      expect(client.configExists).toBe(true);
      const configPath = "/Users/test/Library/Application Support/Claude/claude_desktop_config.json";
      const configContent = vol.readFileSync(configPath, "utf-8") as string;
      const config = JSON.parse(configContent);
      expect(config).toEqual({ mcpServers: {} });

      mockExecSync.mockRestore();
    });

    it("should handle existing config files during auto-creation", async () => {
      vol.fromJSON({
        "/Users/test/.cursor/mcp.json": JSON.stringify({ mcpServers: { existing: {} } }),
      });

      const client = await clientManager.detectClient("cursor");
      
      expect(client.configExists).toBe(true);
      expect(client.isInstalled).toBe(true);
      
      // Should not overwrite existing config
      const configContent = vol.readFileSync("/Users/test/.cursor/mcp.json", "utf-8") as string;
      const config = JSON.parse(configContent);
      expect(config).toEqual({ mcpServers: { existing: {} } });
    });

    it("should handle JSON.stringify errors during auto-config creation", async () => {
      vol.fromJSON({
        "/Users/test/.cursor/": null,
      });

      // Mock JSON.stringify to fail
      const originalStringify = JSON.stringify;
      JSON.stringify = jest.fn(() => {
        throw new Error("JSON stringify failed");
      });

      const mockExecSync = jest.spyOn(require("child_process"), "execSync");
      mockExecSync.mockImplementation(() => {
        throw new Error("Command not found");
      });

      try {
        const client = await clientManager.detectClient("cursor");
        expect(client.isInstalled).toBe(false);
        expect(client.configExists).toBe(false);
      } finally {
        JSON.stringify = originalStringify;
        mockExecSync.mockRestore();
      }
    });
  });
});