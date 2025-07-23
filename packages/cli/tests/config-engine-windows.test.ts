import { vol } from 'memfs';
import { ConfigEngine } from '../src/core/config-engine';

describe('ConfigEngine - Windows Specific Tests', () => {
  let configEngine: ConfigEngine;

  beforeEach(() => {
    vol.reset();
    configEngine = new ConfigEngine();
  });

  describe('createBackup - Windows paths', () => {
    it('should handle Windows paths with colons and backslashes', async () => {
      const windowsConfigPath = 'C:\\Users\\myUser\\.claude\\config.json';
      const testConfig = {
        mcpServers: {
          'playwright': {
            command: 'npx',
            args: ['@playwright/mcp@latest']
          }
        }
      };

      vol.fromJSON({
        [windowsConfigPath]: JSON.stringify(testConfig)
      });

      const backup = await configEngine.createBackup(windowsConfigPath);

      expect(backup.backupPath).toBeDefined();

      // Extract just the backup filename from the full path
      const backupFileName = backup.backupPath.split(/[/\\]/).pop();
      expect(backupFileName).toBeDefined();

      // The backup filename should not contain invalid Windows filename characters
      expect(backupFileName).not.toMatch(/[<>:"|?*]/);
      expect(backupFileName).toContain('C_');
      expect(backupFileName).toContain('Users_myUser');
      expect(backupFileName).toContain('.backup');

      expect(backup.configPath).toBe(windowsConfigPath);
      expect(backup.timestamp).toBeDefined();
    });

    it('should throw error when Windows config file does not exist', async () => {
      const nonExistentPath = 'C:\\NonExistent\\config.json';

      await expect(configEngine.createBackup(nonExistentPath))
        .rejects.toThrow('Config file does not exist');
    });
  });
}); 