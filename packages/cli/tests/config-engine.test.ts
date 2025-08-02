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

  describe('additional error handling and edge cases', () => {
    it('should handle config with malformed mcpServers structure', async () => {
      vol.fromJSON({
        [testConfigPath]: JSON.stringify({ mcpServers: 'not-an-object' })
      });

      const config = await configEngine.readConfig(testConfigPath);
      
      expect(config.mcpServers).toEqual({});
    });

    it('should handle config with null mcpServers', async () => {
      vol.fromJSON({
        [testConfigPath]: JSON.stringify({ mcpServers: null })
      });

      const config = await configEngine.readConfig(testConfigPath);
      
      expect(config.mcpServers).toEqual({});
    });

    it('should preserve other config properties when adding mcpServers', async () => {
      const originalConfig = {
        someProperty: 'value',
        anotherProperty: { nested: 'data' },
        arrayProperty: [1, 2, 3]
      };

      vol.fromJSON({
        [testConfigPath]: JSON.stringify(originalConfig)
      });

      const config = await configEngine.readConfig(testConfigPath);
      
      expect(config.mcpServers).toEqual({});
      expect(config.someProperty).toBe('value');
      expect(config.anotherProperty).toEqual({ nested: 'data' });
      expect(config.arrayProperty).toEqual([1, 2, 3]);
    });

    it('should handle empty JSON object', async () => {
      vol.fromJSON({
        [testConfigPath]: JSON.stringify({})
      });

      const config = await configEngine.readConfig(testConfigPath);
      
      expect(config).toEqual({ mcpServers: {} });
    });

    it('should handle config file with only whitespace', async () => {
      vol.fromJSON({
        [testConfigPath]: '   \n\t  '
      });

      await expect(configEngine.readConfig(testConfigPath)).rejects.toThrow();
    });

    it('should handle large config files', async () => {
      const largeConfig = {
        mcpServers: {},
        largeData: 'x'.repeat(100000)
      };

      vol.fromJSON({
        [testConfigPath]: JSON.stringify(largeConfig)
      });

      const config = await configEngine.readConfig(testConfigPath);
      
      expect(config.largeData).toBe('x'.repeat(100000));
      expect(config.mcpServers).toEqual({});
    });
  });

  describe('writeConfig edge cases', () => {
    it('should handle writing config with circular references', async () => {
      const configWithCircular: any = {
        mcpServers: {
          'test-server': {
            command: 'npx',
            args: ['test']
          }
        }
      };
      configWithCircular.circular = configWithCircular;

      await expect(configEngine.writeConfig(testConfigPath, configWithCircular))
        .rejects.toThrow();
    });

    it('should handle writing to deeply nested path', async () => {
      const deepPath = '/Users/test/.cursor/deeply/nested/path/config.json';
      const testConfig = { mcpServers: {} };

      await configEngine.writeConfig(deepPath, testConfig);

      expect(vol.existsSync(deepPath)).toBe(true);
      const content = vol.readFileSync(deepPath, 'utf-8') as string;
      expect(JSON.parse(content)).toEqual(testConfig);
    });

    it('should handle writing config with special characters in server names', async () => {
      const testConfig = {
        mcpServers: {
          'server-with-special-chars!@#$%': {
            command: 'npx',
            args: ['test-package']
          },
          'server with spaces': {
            command: 'node',
            args: ['script.js']
          }
        }
      };

      await configEngine.writeConfig(testConfigPath, testConfig);

      const writtenConfig = JSON.parse(vol.readFileSync(testConfigPath, 'utf-8') as string);
      expect(writtenConfig).toEqual(testConfig);
    });

    it('should preserve JSON formatting and indentation', async () => {
      const testConfig = {
        mcpServers: {
          'formatted-server': {
            command: 'npx',
            args: ['package']
          }
        }
      };

      await configEngine.writeConfig(testConfigPath, testConfig);

      const fileContent = vol.readFileSync(testConfigPath, 'utf-8') as string;
      expect(fileContent).toContain('  '); // Check for indentation
      expect(fileContent.split('\n').length).toBeGreaterThan(1); // Check for multiple lines
    });
  });

  describe('installServer advanced scenarios', () => {
    beforeEach(() => {
      vol.fromJSON({
        [testConfigPath]: JSON.stringify({ mcpServers: {} })
      });
    });

    it('should handle server installation with complex args', async () => {
      const complexServerConfig = {
        command: 'python',
        args: ['-m', 'uvicorn', 'app:main', '--host', '0.0.0.0', '--port', '8000']
      };

      await configEngine.installServer(testConfigPath, 'complex-server', complexServerConfig, { backup: false });

      const config = await configEngine.readConfig(testConfigPath);
      expect(config.mcpServers['complex-server']).toEqual(complexServerConfig);
    });

    it('should handle server installation with env variables', async () => {
      const serverWithEnv = {
        command: 'node',
        args: ['server.js'],
        env: {
          'NODE_ENV': 'production',
          'API_KEY': 'secret'
        }
      };

      await configEngine.installServer(testConfigPath, 'env-server', serverWithEnv, { backup: false });

      const config = await configEngine.readConfig(testConfigPath);
      expect(config.mcpServers['env-server']).toEqual(serverWithEnv);
    });

    it('should handle concurrent server installations', async () => {
      const server1 = { command: 'npx', args: ['package1'] };
      const server2 = { command: 'npx', args: ['package2'] };

      await Promise.all([
        configEngine.installServer(testConfigPath, 'server1', server1, { backup: false }),
        configEngine.installServer(testConfigPath, 'server2', server2, { backup: false })
      ]);

      const config = await configEngine.readConfig(testConfigPath);
      expect(config.mcpServers['server1']).toEqual(server1);
      expect(config.mcpServers['server2']).toEqual(server2);
    });

    it('should handle server names with unicode characters', async () => {
      const unicodeServerConfig = {
        command: 'python',
        args: ['unicode_server.py']
      };

      await configEngine.installServer(testConfigPath, 'server-ñ-测试-🚀', unicodeServerConfig, { backup: false });

      const config = await configEngine.readConfig(testConfigPath);
      expect(config.mcpServers['server-ñ-测试-🚀']).toEqual(unicodeServerConfig);
    });

    it('should maintain server order after installation', async () => {
      const existingConfig = {
        mcpServers: {
          'alpha': { command: 'alpha', args: [] },
          'charlie': { command: 'charlie', args: [] }
        }
      };

      vol.fromJSON({
        [testConfigPath]: JSON.stringify(existingConfig)
      });

      await configEngine.installServer(testConfigPath, 'beta', { command: 'beta', args: [] }, { backup: false });

      const config = await configEngine.readConfig(testConfigPath);
      const serverNames = Object.keys(config.mcpServers);
      expect(serverNames).toContain('alpha');
      expect(serverNames).toContain('beta');
      expect(serverNames).toContain('charlie');
    });
  });

  describe('uninstallServer advanced scenarios', () => {
    beforeEach(() => {
      vol.fromJSON({
        [testConfigPath]: JSON.stringify({
          mcpServers: {
            'server-1': { command: 'cmd1', args: [] },
            'server-2': { command: 'cmd2', args: [] },
            'server-3': { command: 'cmd3', args: [] }
          }
        })
      });
    });

    it('should uninstall server while preserving order of remaining servers', async () => {
      await configEngine.uninstallServer(testConfigPath, 'server-2', { backup: false });

      const config = await configEngine.readConfig(testConfigPath);
      const serverNames = Object.keys(config.mcpServers);
      expect(serverNames).toEqual(['server-1', 'server-3']);
    });

    it('should handle uninstalling the last server', async () => {
      await configEngine.uninstallServer(testConfigPath, 'server-1', { backup: false });
      await configEngine.uninstallServer(testConfigPath, 'server-2', { backup: false });
      await configEngine.uninstallServer(testConfigPath, 'server-3', { backup: false });

      const config = await configEngine.readConfig(testConfigPath);
      expect(config.mcpServers).toEqual({});
    });

    it('should handle case-sensitive server names', async () => {
      vol.fromJSON({
        [testConfigPath]: JSON.stringify({
          mcpServers: {
            'CaseSensitive': { command: 'cmd', args: [] },
            'casesensitive': { command: 'cmd', args: [] }
          }
        })
      });

      await configEngine.uninstallServer(testConfigPath, 'CaseSensitive', { backup: false });

      const config = await configEngine.readConfig(testConfigPath);
      expect(config.mcpServers['CaseSensitive']).toBeUndefined();
      expect(config.mcpServers['casesensitive']).toBeDefined();
    });

    it('should handle uninstalling server with special characters in name', async () => {
      vol.fromJSON({
        [testConfigPath]: JSON.stringify({
          mcpServers: {
            'special-@#$%-server': { command: 'cmd', args: [] }
          }
        })
      });

      await configEngine.uninstallServer(testConfigPath, 'special-@#$%-server', { backup: false });

      const config = await configEngine.readConfig(testConfigPath);
      expect(config.mcpServers['special-@#$%-server']).toBeUndefined();
    });
  });

  describe('listInstalledServers advanced scenarios', () => {
    it('should return servers in consistent order', async () => {
      const testConfig = {
        mcpServers: {
          'zebra': { command: 'zebra', args: [] },
          'alpha': { command: 'alpha', args: [] },
          'beta': { command: 'beta', args: [] }
        }
      };

      vol.fromJSON({
        [testConfigPath]: JSON.stringify(testConfig)
      });

      const servers = await configEngine.listInstalledServers(testConfigPath);
      const serverNames = Object.keys(servers);
      
      // Should maintain the order from the config file
      expect(serverNames).toEqual(['zebra', 'alpha', 'beta']);
    });

    it('should handle servers with complex configurations', async () => {
      const complexConfig = {
        mcpServers: {
          'complex-server': {
            command: 'docker',
            args: ['run', '-it', '--rm', 'image'],
            env: { 'VAR': 'value' },
            timeout: 30000,
            retries: 3
          }
        }
      };

      vol.fromJSON({
        [testConfigPath]: JSON.stringify(complexConfig)
      });

      const servers = await configEngine.listInstalledServers(testConfigPath);
      
      expect(servers['complex-server']).toEqual(complexConfig.mcpServers['complex-server']);
    });

    it('should handle large number of servers', async () => {
      const manyServers: any = {};
      for (let i = 0; i < 100; i++) {
        manyServers[`server-${i.toString().padStart(3, '0')}`] = {
          command: `cmd${i}`,
          args: [`arg${i}`]
        };
      }

      vol.fromJSON({
        [testConfigPath]: JSON.stringify({ mcpServers: manyServers })
      });

      const servers = await configEngine.listInstalledServers(testConfigPath);
      
      expect(Object.keys(servers)).toHaveLength(100);
      expect(servers['server-050']).toBeDefined();
    });
  });

  describe('validateConfig advanced validation', () => {
    it('should validate server with url instead of command', async () => {
      const configWithUrl = {
        mcpServers: {
          'remote-server': {
            url: 'http://localhost:8000/mcp',
            timeout: 5000
          }
        }
      };

      vol.fromJSON({
        [testConfigPath]: JSON.stringify(configWithUrl)
      });

      const result = await configEngine.validateConfig(testConfigPath);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect servers with both command and url', async () => {
      const invalidConfig = {
        mcpServers: {
          'invalid-server': {
            command: 'npx',
            url: 'http://localhost:8000',
            args: ['package']
          }
        }
      };

      vol.fromJSON({
        [testConfigPath]: JSON.stringify(invalidConfig)
      });

      const result = await configEngine.validateConfig(testConfigPath);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => 
        error.includes('cannot have both')
      )).toBe(true);
    });

    it('should validate environment variables', async () => {
      const configWithEnv = {
        mcpServers: {
          'env-server': {
            command: 'node',
            args: ['server.js'],
            env: {
              'NODE_ENV': 'production',
              'PORT': '3000'
            }
          }
        }
      };

      vol.fromJSON({
        [testConfigPath]: JSON.stringify(configWithEnv)
      });

      const result = await configEngine.validateConfig(testConfigPath);
      
      expect(result.isValid).toBe(true);
    });

    it('should detect invalid environment variable types', async () => {
      const invalidEnvConfig = {
        mcpServers: {
          'invalid-env-server': {
            command: 'node',
            args: ['server.js'],
            env: 'should-be-object'
          }
        }
      };

      vol.fromJSON({
        [testConfigPath]: JSON.stringify(invalidEnvConfig)
      });

      const result = await configEngine.validateConfig(testConfigPath);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => 
        error.includes('env\' must be an object')
      )).toBe(true);
    });

    it('should validate timeout values', async () => {
      const configWithTimeout = {
        mcpServers: {
          'timeout-server': {
            command: 'slow-command',
            args: [],
            timeout: -1000
          }
        }
      };

      vol.fromJSON({
        [testConfigPath]: JSON.stringify(configWithTimeout)
      });

      const result = await configEngine.validateConfig(testConfigPath);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => 
        error.includes('timeout\' must be a positive number')
      )).toBe(true);
    });

    it('should handle config with nested validation errors', async () => {
      const deeplyInvalidConfig = {
        mcpServers: {
          'server1': {
            args: 'not-array'
          },
          'server2': {
            command: 123
          },
          'server3': {
            url: true
          }
        }
      };

      vol.fromJSON({
        [testConfigPath]: JSON.stringify(deeplyInvalidConfig)
      });

      const result = await configEngine.validateConfig(testConfigPath);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(2);
    });
  });

  describe('createBackup advanced scenarios', () => {
    it('should handle Windows paths with drive letters', async () => {
      const windowsConfigPath = 'C:\\Users\\test\\.cursor\\mcp.json';
      const testConfig = {
        mcpServers: {
          'test-server': { command: 'cmd', args: [] }
        }
      };

      vol.fromJSON({
        [windowsConfigPath]: JSON.stringify(testConfig)
      });

      const backup = await configEngine.createBackup(windowsConfigPath);
      
      expect(backup.backupPath).toBeDefined();
      expect(backup.backupPath).toContain('C_');
      expect(backup.configPath).toBe(windowsConfigPath);
    });

    it('should create backup with timestamp in filename', async () => {
      const testConfig = { mcpServers: {} };

      vol.fromJSON({
        [testConfigPath]: JSON.stringify(testConfig)
      });

      const backup = await configEngine.createBackup(testConfigPath);
      
      expect(backup.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(backup.backupPath).toContain(backup.timestamp.replace(/[:.]/g, '-'));
    });

    it('should handle backup of large config files', async () => {
      const largeConfig = {
        mcpServers: {},
        largeData: 'x'.repeat(50000)
      };

      vol.fromJSON({
        [testConfigPath]: JSON.stringify(largeConfig)
      });

      const backup = await configEngine.createBackup(testConfigPath);
      
      expect(backup.backupPath).toBeDefined();
      expect(vol.existsSync(backup.backupPath)).toBe(true);
      
      const backupContent = JSON.parse(vol.readFileSync(backup.backupPath, 'utf-8') as string);
      expect(backupContent.largeData).toBe('x'.repeat(50000));
    });

    it('should handle backup when backup directory needs creation', async () => {
      const testConfig = { mcpServers: {} };
      const configInDeepPath = '/deep/nested/path/config.json';

      vol.fromJSON({
        [configInDeepPath]: JSON.stringify(testConfig)
      });

      const backup = await configEngine.createBackup(configInDeepPath);
      
      expect(backup.backupPath).toBeDefined();
      expect(vol.existsSync(backup.backupPath)).toBe(true);
    });
  });

  describe('performance and stress tests', () => {
    it('should handle rapid successive operations', async () => {
      const operations = [];
      
      // Perform multiple operations quickly
      for (let i = 0; i < 10; i++) {
        operations.push(
          configEngine.installServer(testConfigPath, `server-${i}`, {
            command: `cmd-${i}`,
            args: [`arg-${i}`]
          }, { backup: false })
        );
      }

      await Promise.all(operations);

      const config = await configEngine.readConfig(testConfigPath);
      expect(Object.keys(config.mcpServers)).toHaveLength(10);
    });

    it('should handle config files with many servers efficiently', async () => {
      const manyServers: any = {};
      for (let i = 0; i < 1000; i++) {
        manyServers[`server-${i}`] = {
          command: `command-${i}`,
          args: [`arg-${i}`]
        };
      }

      vol.fromJSON({
        [testConfigPath]: JSON.stringify({ mcpServers: manyServers })
      });

      const startTime = Date.now();
      const servers = await configEngine.listInstalledServers(testConfigPath);
      const endTime = Date.now();

      expect(Object.keys(servers)).toHaveLength(1000);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should handle validation of complex configurations efficiently', async () => {
      const complexConfig = {
        mcpServers: {}
      };

      // Create 100 servers with complex configurations
      for (let i = 0; i < 100; i++) {
        complexConfig.mcpServers[`complex-server-${i}`] = {
          command: `command-${i}`,
          args: Array.from({ length: 10 }, (_, j) => `arg-${i}-${j}`),
          env: Object.fromEntries(
            Array.from({ length: 5 }, (_, j) => [`ENV_${i}_${j}`, `value-${i}-${j}`])
          ),
          timeout: 5000 + i * 100
        };
      }

      vol.fromJSON({
        [testConfigPath]: JSON.stringify(complexConfig)
      });

      const startTime = Date.now();
      const result = await configEngine.validateConfig(testConfigPath);
      const endTime = Date.now();

      expect(result.isValid).toBe(true);
      expect(endTime - startTime).toBeLessThan(2000); // Should complete within 2 seconds
    });
  });

  describe('memory and resource management', () => {
    it('should not leak memory during repeated operations', async () => {
      // Simulate memory usage by performing many operations
      for (let i = 0; i < 50; i++) {
        await configEngine.installServer(testConfigPath, `temp-server-${i}`, {
          command: 'temp-cmd',
          args: ['temp-arg']
        }, { backup: false });

        await configEngine.uninstallServer(testConfigPath, `temp-server-${i}`, { backup: false });
      }

      // Verify final state is clean
      const config = await configEngine.readConfig(testConfigPath);
      expect(Object.keys(config.mcpServers)).toHaveLength(0);
    });

    it('should handle cleanup after failed operations', async () => {
      // Attempt an operation that should fail
      vol.fromJSON({
        [testConfigPath]: 'invalid json content'
      });

      await expect(configEngine.readConfig(testConfigPath)).rejects.toThrow();

      // Ensure the system can recover
      vol.fromJSON({
        [testConfigPath]: JSON.stringify({ mcpServers: {} })
      });

      const config = await configEngine.readConfig(testConfigPath);
      expect(config).toEqual({ mcpServers: {} });
    });
  });
});