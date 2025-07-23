import { vol } from 'memfs';
import { ConfigEngine } from '../src/core/config-engine';

describe('ConfigEngine', () => {
  let configEngine: ConfigEngine;
  const testConfigPath = '/Users/test/.cursor/mcp.json';

  beforeEach(() => {
    vol.reset();
    configEngine = new ConfigEngine();
  });

  describe('readConfig', () => {
    it('should read existing config file', async () => {
      const testConfig = {
        mcpServers: {
          'test-server': {
            command: 'npx',
            args: ['test-package']
          }
        }
      };

      vol.fromJSON({
        [testConfigPath]: JSON.stringify(testConfig)
      });

      const config = await configEngine.readConfig(testConfigPath);
      
      expect(config).toEqual(testConfig);
      expect(config.mcpServers['test-server']).toBeDefined();
    });

    it('should return default config when file does not exist', async () => {
      const config = await configEngine.readConfig(testConfigPath);
      
      expect(config).toEqual({ mcpServers: {} });
    });

    it('should add mcpServers property if missing', async () => {
      vol.fromJSON({
        [testConfigPath]: JSON.stringify({ someOtherProperty: 'value' })
      });

      const config = await configEngine.readConfig(testConfigPath);
      
      expect(config.mcpServers).toEqual({});
      expect(config.someOtherProperty).toBe('value');
    });

    it('should throw error for invalid JSON', async () => {
      vol.fromJSON({
        [testConfigPath]: 'invalid json content'
      });

      await expect(configEngine.readConfig(testConfigPath)).rejects.toThrow();
    });
  });

  describe('writeConfig', () => {
    it('should write config to file', async () => {
      const testConfig = {
        mcpServers: {
          'playwright': {
            command: 'npx',
            args: ['@playwright/mcp@latest']
          }
        }
      };

      await configEngine.writeConfig(testConfigPath, testConfig);

      const fileContent = vol.readFileSync(testConfigPath, 'utf-8') as string;
      const writtenConfig = JSON.parse(fileContent);
      
      expect(writtenConfig).toEqual(testConfig);
    });

    it('should create directory if it does not exist', async () => {
      const newConfigPath = '/Users/test/.newclient/config.json';
      const testConfig = { mcpServers: {} };

      await configEngine.writeConfig(newConfigPath, testConfig);

      expect(vol.existsSync(newConfigPath)).toBe(true);
    });
  });

  describe('installServer', () => {
    beforeEach(() => {
      vol.fromJSON({
        [testConfigPath]: JSON.stringify({ mcpServers: {} })
      });
    });

    it('should install new server', async () => {
      const serverConfig = {
        command: 'npx',
        args: ['@playwright/mcp@latest']
      };

      await configEngine.installServer(testConfigPath, 'playwright', serverConfig, { backup: false });

      const config = await configEngine.readConfig(testConfigPath);
      expect(config.mcpServers['playwright']).toEqual(serverConfig);
    });

    it('should not overwrite existing server without force flag', async () => {
      const existingConfig = {
        mcpServers: {
          'playwright': {
            command: 'npx',
            args: ['@playwright/mcp@0.1.0']
          }
        }
      };

      vol.fromJSON({
        [testConfigPath]: JSON.stringify(existingConfig)
      });

      const newServerConfig = {
        command: 'npx',
        args: ['@playwright/mcp@latest']
      };

      await expect(
        configEngine.installServer(testConfigPath, 'playwright', newServerConfig, { backup: false })
      ).rejects.toThrow('already installed');
    });

    it('should overwrite existing server with force flag', async () => {
      const existingConfig = {
        mcpServers: {
          'playwright': {
            command: 'npx',
            args: ['@playwright/mcp@0.1.0']
          }
        }
      };

      vol.fromJSON({
        [testConfigPath]: JSON.stringify(existingConfig)
      });

      const newServerConfig = {
        command: 'npx',
        args: ['@playwright/mcp@latest']
      };

      await configEngine.installServer(testConfigPath, 'playwright', newServerConfig, { 
        backup: false, 
        force: true 
      });

      const config = await configEngine.readConfig(testConfigPath);
      expect(config.mcpServers['playwright']).toEqual(newServerConfig);
    });
  });

  describe('uninstallServer', () => {
    beforeEach(() => {
      vol.fromJSON({
        [testConfigPath]: JSON.stringify({
          mcpServers: {
            'playwright': {
              command: 'npx',
              args: ['@playwright/mcp@latest']
            },
            'filesystem': {
              command: 'npx',
              args: ['@modelcontextprotocol/server-filesystem']
            }
          }
        })
      });
    });

    it('should uninstall existing server', async () => {
      await configEngine.uninstallServer(testConfigPath, 'playwright', { backup: false });

      const config = await configEngine.readConfig(testConfigPath);
      expect(config.mcpServers['playwright']).toBeUndefined();
      expect(config.mcpServers['filesystem']).toBeDefined();
    });

    it('should throw error when server is not installed', async () => {
      await expect(
        configEngine.uninstallServer(testConfigPath, 'non-existent', { backup: false })
      ).rejects.toThrow('is not installed');
    });
  });

  describe('listInstalledServers', () => {
    it('should return installed servers', async () => {
      const testConfig = {
        mcpServers: {
          'playwright': {
            command: 'npx',
            args: ['@playwright/mcp@latest']
          },
          'filesystem': {
            command: 'npx',
            args: ['@modelcontextprotocol/server-filesystem']
          }
        }
      };

      vol.fromJSON({
        [testConfigPath]: JSON.stringify(testConfig)
      });

      const servers = await configEngine.listInstalledServers(testConfigPath);
      
      expect(Object.keys(servers)).toHaveLength(2);
      expect(servers['playwright']).toBeDefined();
      expect(servers['filesystem']).toBeDefined();
    });

    it('should return empty object when no servers installed', async () => {
      vol.fromJSON({
        [testConfigPath]: JSON.stringify({ mcpServers: {} })
      });

      const servers = await configEngine.listInstalledServers(testConfigPath);
      
      expect(servers).toEqual({});
    });
  });

  describe('createBackup', () => {
    it('should handle Unix paths normally', async () => {
      const unixConfigPath = '/Users/test/.cursor/mcp.json';
      const testConfig = {
        mcpServers: {
          'filesystem': {
            command: 'npx',
            args: ['@modelcontextprotocol/server-filesystem']
          }
        }
      };

      vol.fromJSON({
        [unixConfigPath]: JSON.stringify(testConfig)
      });

      const backup = await configEngine.createBackup(unixConfigPath);
      
      expect(backup.backupPath).toBeDefined();
      expect(backup.backupPath).toContain('_Users_test_');
      expect(backup.configPath).toBe(unixConfigPath);
      expect(backup.timestamp).toBeDefined();
    });

    it('should throw error when config file does not exist', async () => {
      const nonExistentPath = '/Users/nonexistent/.cursor/config.json';

      await expect(configEngine.createBackup(nonExistentPath))
        .rejects.toThrow('Config file does not exist');
    });
  });

  describe('validateConfig', () => {
    it('should validate correct config', async () => {
      const validConfig = {
        mcpServers: {
          'playwright': {
            command: 'npx',
            args: ['@playwright/mcp@latest']
          }
        }
      };

      vol.fromJSON({
        [testConfigPath]: JSON.stringify(validConfig)
      });

      const result = await configEngine.validateConfig(testConfigPath);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing command', async () => {
      const invalidConfig = {
        mcpServers: {
          'invalid-server': {
            args: ['some-args']
          }
        }
      };

      vol.fromJSON({
        [testConfigPath]: JSON.stringify(invalidConfig)
      });

      const result = await configEngine.validateConfig(testConfigPath);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => 
        error.includes('must have either \'command\' (for local servers) or \'url\' (for remote servers)')
      )).toBe(true);
    });

    it('should detect invalid args type', async () => {
      const invalidConfig = {
        mcpServers: {
          'invalid-server': {
            command: 'npx',
            args: 'should-be-array'
          }
        }
      };

      vol.fromJSON({
        [testConfigPath]: JSON.stringify(invalidConfig)
      });

      const result = await configEngine.validateConfig(testConfigPath);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => 
        error.includes('args\' must be an array')
      )).toBe(true);
    });

    it('should warn when config file does not exist', async () => {
      const result = await configEngine.validateConfig('/non/existent/path');
      
      expect(result.isValid).toBe(true);
      expect(result.warnings.some(warning => 
        warning.includes('Config file does not exist')
      )).toBe(true);
    });
  });
});