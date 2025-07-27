import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { uninstallCommand } from '../src/commands/uninstall';
import { ClientManager, ConfigEngine } from '../src/core/index.js';
import { ClientType, getClientDisplayName } from '@mcp-installer/shared';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';

// Mock external dependencies
jest.mock('../src/core/index.js');
jest.mock('@mcp-installer/shared');
jest.mock('chalk');
jest.mock('ora');
jest.mock('inquirer');

const mockClientManager = ClientManager as jest.MockedClass<typeof ClientManager>;
const mockConfigEngine = ConfigEngine as jest.MockedClass<typeof ConfigEngine>;
const mockGetClientDisplayName = getClientDisplayName as jest.MockedFunction<typeof getClientDisplayName>;
const mockChalk = chalk as jest.Mocked<typeof chalk>;
const mockOra = ora as jest.MockedFunction<typeof ora>;
const mockInquirer = inquirer as jest.Mocked<typeof inquirer>;

describe('uninstall command', () => {
  let clientManagerInstance: jest.Mocked<ClientManager>;
  let configEngineInstance: jest.Mocked<ConfigEngine>;
  let mockSpinner: any;
  let consoleSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let processExitSpy: jest.SpyInstance;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Create mock instances
    clientManagerInstance = new mockClientManager() as jest.Mocked<ClientManager>;
    configEngineInstance = new mockConfigEngine() as jest.Mocked<ConfigEngine>;
    
    // Setup spinner mock
    mockSpinner = {
      start: jest.fn().mockReturnThis(),
      stop: jest.fn().mockReturnThis(),
      succeed: jest.fn().mockReturnThis(),
      fail: jest.fn().mockReturnThis(),
      warn: jest.fn().mockReturnThis(),
      text: '',
    };
    mockOra.mockReturnValue(mockSpinner);
    
    // Setup console spies
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    processExitSpy = jest.spyOn(process, 'exit').mockImplementation();
    
    // Setup default mock implementations
    clientManagerInstance.detectInstalledClients = jest.fn().mockResolvedValue([
      { type: 'claude' as ClientType, isInstalled: true, configPath: '/mock/claude/config' },
      { type: 'cursor' as ClientType, isInstalled: true, configPath: '/mock/cursor/config' }
    ]);
    clientManagerInstance.isClientSupported = jest.fn().mockReturnValue(true);
    clientManagerInstance.getSupportedClients = jest.fn().mockReturnValue(['claude', 'cursor']);
    
    configEngineInstance.listInstalledServers = jest.fn().mockResolvedValue({});
    configEngineInstance.uninstallServer = jest.fn().mockResolvedValue(undefined);
    
    mockGetClientDisplayName.mockImplementation((client: ClientType) => {
      const displayNames = { claude: 'Claude Desktop', cursor: 'Cursor', vscode: 'VS Code' };
      return displayNames[client] || client;
    });
    
    // Setup chalk mocks
    mockChalk.red = jest.fn().mockImplementation((text) => `RED:${text}`);
    mockChalk.green = jest.fn().mockImplementation((text) => `GREEN:${text}`);
    mockChalk.yellow = jest.fn().mockImplementation((text) => `YELLOW:${text}`);
    mockChalk.cyan = jest.fn().mockImplementation((text) => `CYAN:${text}`);
    mockChalk.white = jest.fn().mockImplementation((text) => `WHITE:${text}`);
    mockChalk.bold = jest.fn().mockImplementation((text) => `BOLD:${text}`);
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    processExitSpy.mockRestore();
    jest.resetAllMocks();
  });

  describe('Happy Path Scenarios', () => {
    it('should successfully uninstall server from single client', async () => {
      const mockInstalledServers = {
        'test-server': { name: 'Test Server', command: 'test', args: [] }
      };
      
      configEngineInstance.listInstalledServers.mockResolvedValue(mockInstalledServers);
      mockInquirer.prompt.mockResolvedValue({ proceed: true });
      
      await uninstallCommand('test-server', { clients: 'claude' });
      
      expect(clientManagerInstance.detectInstalledClients).toHaveBeenCalled();
      expect(configEngineInstance.listInstalledServers).toHaveBeenCalledWith('/mock/claude/config');
      expect(mockInquirer.prompt).toHaveBeenCalledWith([
        expect.objectContaining({
          type: 'confirm',
          name: 'proceed',
          message: "Are you sure you want to uninstall 'test-server'?",
          default: false,
        })
      ]);
      expect(configEngineInstance.uninstallServer).toHaveBeenCalledWith(
        '/mock/claude/config',
        'test-server',
        { backup: undefined }
      );
      expect(mockSpinner.succeed).toHaveBeenCalledWith(expect.stringContaining('Claude Desktop'));
    });

    it('should uninstall from all clients when clients option is "all"', async () => {
      const mockInstalledServers = {
        'test-server': { name: 'Test Server', command: 'test', args: [] }
      };
      
      configEngineInstance.listInstalledServers.mockResolvedValue(mockInstalledServers);
      mockInquirer.prompt.mockResolvedValue({ proceed: true });
      
      await uninstallCommand('test-server', { clients: 'all' });
      
      expect(configEngineInstance.listInstalledServers).toHaveBeenCalledTimes(2);
      expect(configEngineInstance.listInstalledServers).toHaveBeenCalledWith('/mock/claude/config');
      expect(configEngineInstance.listInstalledServers).toHaveBeenCalledWith('/mock/cursor/config');
      expect(configEngineInstance.uninstallServer).toHaveBeenCalledTimes(2);
    });

    it('should handle multiple clients specified in comma-separated list', async () => {
      const mockInstalledServers = {
        'test-server': { name: 'Test Server', command: 'test', args: [] }
      };
      
      configEngineInstance.listInstalledServers.mockResolvedValue(mockInstalledServers);
      mockInquirer.prompt.mockResolvedValue({ proceed: true });
      
      await uninstallCommand('test-server', { clients: 'claude,cursor' });
      
      expect(configEngineInstance.listInstalledServers).toHaveBeenCalledTimes(2);
      expect(configEngineInstance.uninstallServer).toHaveBeenCalledTimes(2);
    });

    it('should perform dry run without actual uninstallation', async () => {
      const mockInstalledServers = {
        'test-server': { name: 'Test Server', command: 'test', args: [] }
      };
      
      configEngineInstance.listInstalledServers.mockResolvedValue(mockInstalledServers);
      
      await uninstallCommand('test-server', { clients: 'claude', dryRun: true });
      
      expect(configEngineInstance.uninstallServer).not.toHaveBeenCalled();
      expect(mockSpinner.succeed).toHaveBeenCalledWith(expect.stringContaining('Dry run completed'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Would uninstall from:'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Claude Desktop'));
    });

    it('should create backup when backup option is enabled', async () => {
      const mockInstalledServers = {
        'test-server': { name: 'Test Server', command: 'test', args: [] }
      };
      
      configEngineInstance.listInstalledServers.mockResolvedValue(mockInstalledServers);
      mockInquirer.prompt.mockResolvedValue({ proceed: true });
      
      await uninstallCommand('test-server', { clients: 'claude', backup: true });
      
      expect(configEngineInstance.uninstallServer).toHaveBeenCalledWith(
        '/mock/claude/config',
        'test-server',
        { backup: true }
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle no supported clients detected', async () => {
      clientManagerInstance.detectInstalledClients.mockResolvedValue([
        { type: 'claude' as ClientType, isInstalled: false, configPath: '' },
        { type: 'cursor' as ClientType, isInstalled: false, configPath: '' }
      ]);
      
      await uninstallCommand('test-server', { clients: 'all' });
      
      expect(mockSpinner.fail).toHaveBeenCalledWith(expect.stringContaining('No supported AI clients detected'));
    });

    it('should handle unsupported client type', async () => {
      clientManagerInstance.isClientSupported.mockReturnValue(false);
      
      await uninstallCommand('test-server', { clients: 'unsupported-client' });
      
      expect(mockSpinner.fail).toHaveBeenCalledWith(expect.stringContaining('Unsupported client: unsupported-client'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Supported clients:'));
    });

    it('should skip clients that are not installed', async () => {
      clientManagerInstance.detectInstalledClients.mockResolvedValue([
        { type: 'claude' as ClientType, isInstalled: true, configPath: '/mock/claude/config' },
        { type: 'cursor' as ClientType, isInstalled: false, configPath: '' }
      ]);
      
      await uninstallCommand('test-server', { clients: 'claude,cursor' });
      
      expect(mockSpinner.warn).toHaveBeenCalledWith(expect.stringContaining('Cursor'));
      expect(mockSpinner.warn).toHaveBeenCalledWith(expect.stringContaining('not detected, skipping'));
    });

    it('should handle server not installed on any specified clients', async () => {
      configEngineInstance.listInstalledServers.mockResolvedValue({});
      
      await uninstallCommand('non-existent-server', { clients: 'claude' });
      
      expect(mockSpinner.fail).toHaveBeenCalledWith(
        expect.stringContaining("Server 'non-existent-server' is not installed on any of the specified clients")
      );
    });

    it('should handle configuration read errors gracefully', async () => {
      configEngineInstance.listInstalledServers.mockRejectedValue(new Error('Config read error'));
      
      await uninstallCommand('test-server', { clients: 'claude' });
      
      expect(mockSpinner.warn).toHaveBeenCalledWith(expect.stringContaining('Could not read config for Claude Desktop'));
    });

    it('should handle whitespace in client names', async () => {
      const mockInstalledServers = {
        'test-server': { name: 'Test Server', command: 'test', args: [] }
      };
      
      configEngineInstance.listInstalledServers.mockResolvedValue(mockInstalledServers);
      mockInquirer.prompt.mockResolvedValue({ proceed: true });
      
      await uninstallCommand('test-server', { clients: ' claude , cursor ' });
      
      expect(configEngineInstance.listInstalledServers).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error Handling', () => {
    it('should handle uninstallation failures gracefully', async () => {
      const mockInstalledServers = {
        'failing-server': { name: 'Failing Server', command: 'test', args: [] }
      };
      
      configEngineInstance.listInstalledServers.mockResolvedValue(mockInstalledServers);
      configEngineInstance.uninstallServer.mockRejectedValue(new Error('Uninstallation failed'));
      mockInquirer.prompt.mockResolvedValue({ proceed: true });
      
      await uninstallCommand('failing-server', { clients: 'claude' });
      
      expect(mockSpinner.fail).toHaveBeenCalledWith(
        expect.stringContaining('Failed to uninstall from Claude Desktop: Uninstallation failed')
      );
    });

    it('should handle partial failures across multiple clients', async () => {
      const mockInstalledServers = {
        'test-server': { name: 'Test Server', command: 'test', args: [] }
      };
      
      configEngineInstance.listInstalledServers.mockResolvedValue(mockInstalledServers);
      configEngineInstance.uninstallServer
        .mockResolvedValueOnce(undefined)  // First client succeeds
        .mockRejectedValueOnce(new Error('Second client fails'));  // Second client fails
      mockInquirer.prompt.mockResolvedValue({ proceed: true });
      
      await uninstallCommand('test-server', { clients: 'claude,cursor' });
      
      expect(mockSpinner.succeed).toHaveBeenCalledWith(expect.stringContaining('Claude Desktop'));
      expect(mockSpinner.fail).toHaveBeenCalledWith(expect.stringContaining('Cursor'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Successful: 1'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Failed: 1'));
    });

    it('should handle unexpected errors and exit with code 1', async () => {
      clientManagerInstance.detectInstalledClients.mockRejectedValue(new Error('Unexpected error'));
      
      await uninstallCommand('test-server', { clients: 'claude' });
      
      expect(mockSpinner.fail).toHaveBeenCalledWith(expect.stringContaining('Uninstallation failed'));
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Unexpected error'));
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('should handle file system permission errors', async () => {
      const mockInstalledServers = {
        'test-server': { name: 'Test Server', command: 'test', args: [] }
      };
      
      configEngineInstance.listInstalledServers.mockResolvedValue(mockInstalledServers);
      configEngineInstance.uninstallServer.mockRejectedValue(new Error('EACCES: permission denied'));
      mockInquirer.prompt.mockResolvedValue({ proceed: true });
      
      await uninstallCommand('test-server', { clients: 'claude' });
      
      expect(mockSpinner.fail).toHaveBeenCalledWith(expect.stringContaining('permission denied'));
    });

    it('should handle network-related errors', async () => {
      const mockInstalledServers = {
        'test-server': { name: 'Test Server', command: 'test', args: [] }
      };
      
      configEngineInstance.listInstalledServers.mockResolvedValue(mockInstalledServers);
      configEngineInstance.uninstallServer.mockRejectedValue(new Error('ENOTFOUND: DNS lookup failed'));
      mockInquirer.prompt.mockResolvedValue({ proceed: true });
      
      await uninstallCommand('test-server', { clients: 'claude' });
      
      expect(mockSpinner.fail).toHaveBeenCalledWith(expect.stringContaining('DNS lookup failed'));
    });
  });

  describe('User Interaction', () => {
    it('should prompt for confirmation before uninstalling', async () => {
      const mockInstalledServers = {
        'test-server': { name: 'Test Server', command: 'test', args: [] }
      };
      
      configEngineInstance.listInstalledServers.mockResolvedValue(mockInstalledServers);
      mockInquirer.prompt.mockResolvedValue({ proceed: true });
      
      await uninstallCommand('test-server', { clients: 'claude' });
      
      expect(mockInquirer.prompt).toHaveBeenCalledWith([
        expect.objectContaining({
          type: 'confirm',
          name: 'proceed',
          message: "Are you sure you want to uninstall 'test-server'?",
          default: false,
        })
      ]);
    });

    it('should cancel uninstallation when user declines', async () => {
      const mockInstalledServers = {
        'test-server': { name: 'Test Server', command: 'test', args: [] }
      };
      
      configEngineInstance.listInstalledServers.mockResolvedValue(mockInstalledServers);
      mockInquirer.prompt.mockResolvedValue({ proceed: false });
      
      await uninstallCommand('test-server', { clients: 'claude' });
      
      expect(configEngineInstance.uninstallServer).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Uninstallation cancelled'));
    });

    it('should display client list before confirmation', async () => {
      const mockInstalledServers = {
        'test-server': { name: 'Test Server', command: 'test', args: [] }
      };
      
      configEngineInstance.listInstalledServers.mockResolvedValue(mockInstalledServers);
      mockInquirer.prompt.mockResolvedValue({ proceed: true });
      
      await uninstallCommand('test-server', { clients: 'claude,cursor' });
      
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("About to uninstall 'test-server' from 2 client(s):"));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('• Claude Desktop'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('• Cursor'));
    });
  });

  describe('Reporting and Summary', () => {
    it('should display uninstallation summary with success count', async () => {
      const mockInstalledServers = {
        'test-server': { name: 'Test Server', command: 'test', args: [] }
      };
      
      configEngineInstance.listInstalledServers.mockResolvedValue(mockInstalledServers);
      mockInquirer.prompt.mockResolvedValue({ proceed: true });
      
      await uninstallCommand('test-server', { clients: 'claude,cursor' });
      
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Uninstallation Summary:'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('✓ Successful: 2'));
    });

    it('should display next steps after successful uninstallation', async () => {
      const mockInstalledServers = {
        'test-server': { name: 'Test Server', command: 'test', args: [] }
      };
      
      configEngineInstance.listInstalledServers.mockResolvedValue(mockInstalledServers);
      mockInquirer.prompt.mockResolvedValue({ proceed: true });
      
      await uninstallCommand('test-server', { clients: 'claude' });
      
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Next steps:'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('1. Restart your AI client(s)'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('2. The test-server server should no longer be available'));
    });

    it('should show both success and failure counts in mixed results', async () => {
      const mockInstalledServers = {
        'test-server': { name: 'Test Server', command: 'test', args: [] }
      };
      
      configEngineInstance.listInstalledServers.mockResolvedValue(mockInstalledServers);
      configEngineInstance.uninstallServer
        .mockResolvedValueOnce(undefined)  // Success
        .mockRejectedValueOnce(new Error('Failure'));  // Failure
      mockInquirer.prompt.mockResolvedValue({ proceed: true });
      
      await uninstallCommand('test-server', { clients: 'claude,cursor' });
      
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('✓ Successful: 1'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('✗ Failed: 1'));
    });

    it('should not show failed count when all succeed', async () => {
      const mockInstalledServers = {
        'test-server': { name: 'Test Server', command: 'test', args: [] }
      };
      
      configEngineInstance.listInstalledServers.mockResolvedValue(mockInstalledServers);
      mockInquirer.prompt.mockResolvedValue({ proceed: true });
      
      await uninstallCommand('test-server', { clients: 'claude' });
      
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('✓ Successful: 1'));
      expect(consoleSpy).not.toHaveBeenCalledWith(expect.stringContaining('✗ Failed:'));
    });
  });

  describe('Spinner State Management', () => {
    it('should update spinner text during different phases', async () => {
      const mockInstalledServers = {
        'test-server': { name: 'Test Server', command: 'test', args: [] }
      };
      
      configEngineInstance.listInstalledServers.mockResolvedValue(mockInstalledServers);
      mockInquirer.prompt.mockResolvedValue({ proceed: true });
      
      await uninstallCommand('test-server', { clients: 'claude' });
      
      expect(mockSpinner.start).toHaveBeenCalledWith('Initializing uninstallation...');
      expect(mockSpinner.text).toBe('Detecting installed clients...');
      expect(mockSpinner.text).toBe('Checking server installations...');
      expect(mockSpinner.text).toBe('Uninstalling from Claude Desktop...');
    });

    it('should use appropriate spinner methods for different outcomes', async () => {
      const mockInstalledServers = {
        'test-server': { name: 'Test Server', command: 'test', args: [] }
      };
      
      configEngineInstance.listInstalledServers.mockResolvedValue(mockInstalledServers);
      mockInquirer.prompt.mockResolvedValue({ proceed: true });
      
      await uninstallCommand('test-server', { clients: 'claude' });
      
      expect(mockSpinner.succeed).toHaveBeenCalledWith(expect.stringContaining('Installation check completed'));
      expect(mockSpinner.succeed).toHaveBeenCalledWith(expect.stringContaining('Uninstalled from Claude Desktop'));
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle very long server names', async () => {
      const longServerName = 'a'.repeat(100);
      const mockInstalledServers = {
        [longServerName]: { name: 'Long Server', command: 'test', args: [] }
      };
      
      configEngineInstance.listInstalledServers.mockResolvedValue(mockInstalledServers);
      mockInquirer.prompt.mockResolvedValue({ proceed: true });
      
      await uninstallCommand(longServerName, { clients: 'claude' });
      
      expect(configEngineInstance.uninstallServer).toHaveBeenCalledWith(
        '/mock/claude/config',
        longServerName,
        { backup: undefined }
      );
    });

    it('should handle server names with special characters', async () => {
      const specialServerName = '@scope/server-name_with.special-chars';
      const mockInstalledServers = {
        [specialServerName]: { name: 'Special Server', command: 'test', args: [] }
      };
      
      configEngineInstance.listInstalledServers.mockResolvedValue(mockInstalledServers);
      mockInquirer.prompt.mockResolvedValue({ proceed: true });
      
      await uninstallCommand(specialServerName, { clients: 'claude' });
      
      expect(configEngineInstance.uninstallServer).toHaveBeenCalledWith(
        '/mock/claude/config',
        specialServerName,
        { backup: undefined }
      );
    });

    it('should handle concurrent operations efficiently', async () => {
      const mockInstalledServers = {
        'test-server': { name: 'Test Server', command: 'test', args: [] }
      };
      
      configEngineInstance.listInstalledServers.mockResolvedValue(mockInstalledServers);
      configEngineInstance.uninstallServer.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(undefined), 50))
      );
      mockInquirer.prompt.mockResolvedValue({ proceed: true });
      
      const startTime = Date.now();
      await uninstallCommand('test-server', { clients: 'claude,cursor' });
      const endTime = Date.now();
      
      // Should handle multiple clients concurrently, not sequentially
      expect(endTime - startTime).toBeLessThan(200);
      expect(configEngineInstance.uninstallServer).toHaveBeenCalledTimes(2);
    });
  });
});