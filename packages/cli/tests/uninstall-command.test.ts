import { vol } from 'memfs';
import { uninstallCommand } from '../src/commands/uninstall';
import { ClientManager, ConfigEngine } from '../src/core/index';
import inquirer from 'inquirer';
import ora from 'ora';
import chalk from 'chalk';

// Mock the shared package to avoid ES module issues
jest.mock('@mcp-installer/shared', () => ({
  ClientType: {},
  getClientDisplayName: jest.fn((type: string) => type.charAt(0).toUpperCase() + type.slice(1)),
  InstallationResult: {},
}));

// Mock dependencies
jest.mock('../src/core/index');
jest.mock('inquirer');
jest.mock('ora', () => jest.fn());
jest.mock('chalk', () => ({
  default: {
    red: jest.fn((text: string) => text),
    green: jest.fn((text: string) => text),
    yellow: jest.fn((text: string) => text),
    cyan: jest.fn((text: string) => text),
    white: jest.fn((text: string) => text),
    blue: jest.fn((text: string) => text),
    magenta: jest.fn((text: string) => text),
  },
  red: jest.fn((text: string) => text),
  green: jest.fn((text: string) => text),
  yellow: jest.fn((text: string) => text),
  cyan: jest.fn((text: string) => text),
  white: jest.fn((text: string) => text),
  blue: jest.fn((text: string) => text),
  magenta: jest.fn((text: string) => text),
}));

describe('uninstallCommand', () => {
  let mockClientManager: jest.Mocked<ClientManager>;
  let mockConfigEngine: jest.Mocked<ConfigEngine>;
  let mockSpinner: any;
  let consoleSpy: jest.SpyInstance;
  let processExitSpy: jest.SpyInstance;

  beforeEach(() => {
    vol.reset();
    jest.clearAllMocks();

    // Setup spinner mock
    mockSpinner = {
      start: jest.fn().mockReturnThis(),
      stop: jest.fn().mockReturnThis(),
      succeed: jest.fn().mockReturnThis(),
      fail: jest.fn().mockReturnThis(),
      warn: jest.fn().mockReturnThis(),
      set text(value: string) {},
    };
    (ora as jest.Mock).mockReturnValue(mockSpinner);

    // Setup ClientManager mock
    mockClientManager = {
      detectInstalledClients: jest.fn(),
      isClientSupported: jest.fn(),
      getSupportedClients: jest.fn(),
    } as any;
    (ClientManager as jest.MockedClass<typeof ClientManager>).mockImplementation(() => mockClientManager);

    // Setup ConfigEngine mock
    mockConfigEngine = {
      listInstalledServers: jest.fn(),
      uninstallServer: jest.fn(),
    } as any;
    (ConfigEngine as jest.MockedClass<typeof ConfigEngine>).mockImplementation(() => mockConfigEngine);

    // Setup console and process mocks
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    processExitSpy = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    processExitSpy.mockRestore();
  });

  describe('successful uninstallation scenarios', () => {
    beforeEach(() => {
      mockClientManager.detectInstalledClients.mockResolvedValue([
        {
          type: 'claude-desktop',
          isInstalled: true,
          configPath: '/test/claude.json',
          name: 'Claude Desktop',
          configExists: true,
        },
        {
          type: 'cursor',
          isInstalled: true,
          configPath: '/test/cursor.json',
          name: 'Cursor',
          configExists: true,
        },
        {
          type: 'gemini',
          isInstalled: true,
          configPath: '/test/gemini.json',
          name: 'Gemini',
          configExists: true,
        },
        {
          type: 'claude-code',
          isInstalled: true,
          configPath: '/test/claude-code.json',
          name: 'Claude Code',
          configExists: true,
        },
      ]);

      mockConfigEngine.listInstalledServers.mockResolvedValue({
        'test-server': { command: 'npx', args: ['test-package'] },
      });

      mockConfigEngine.uninstallServer.mockResolvedValue();
      (inquirer.prompt as jest.MockedFunction<typeof inquirer.prompt>).mockResolvedValue({ proceed: true });
    });

    it('should successfully uninstall from all clients', async () => {
      await uninstallCommand('test-server', { clients: 'all' });

      expect(mockClientManager.detectInstalledClients).toHaveBeenCalled();
      expect(mockConfigEngine.listInstalledServers).toHaveBeenCalledTimes(4);
      expect(mockConfigEngine.uninstallServer).toHaveBeenCalledTimes(4);
      expect(mockSpinner.succeed).toHaveBeenCalledWith(chalk.green('Installation check completed'));
      expect(consoleSpy).toHaveBeenCalledWith(
        chalk.cyan("About to uninstall 'test-server' from 4 client(s):")
      );
    });

    it('should successfully uninstall from specific clients', async () => {
      mockClientManager.isClientSupported.mockReturnValue(true);

      await uninstallCommand('test-server', { clients: 'cursor,gemini' });

      expect(mockConfigEngine.uninstallServer).toHaveBeenCalledTimes(2);
      expect(mockConfigEngine.uninstallServer).toHaveBeenCalledWith(
        '/test/cursor.json',
        'test-server',
        { backup: undefined }
      );
      expect(mockConfigEngine.uninstallServer).toHaveBeenCalledWith(
        '/test/gemini.json',
        'test-server',
        { backup: undefined }
      );
    });

    it('should handle backup option correctly', async () => {
      await uninstallCommand('test-server', { clients: 'all', backup: true });

      expect(mockConfigEngine.uninstallServer).toHaveBeenCalledWith(
        expect.any(String),
        'test-server',
        { backup: true }
      );
    });

    it('should show uninstallation summary', async () => {
      await uninstallCommand('test-server', { clients: 'all' });

      expect(consoleSpy).toHaveBeenCalledWith(chalk.cyan('Uninstallation Summary:'));
      expect(consoleSpy).toHaveBeenCalledWith(chalk.green('  ✓ Successful: 4'));
      expect(consoleSpy).toHaveBeenCalledWith(chalk.yellow('Next steps:'));
    });
  });

  describe('dry run mode', () => {
    beforeEach(() => {
      mockClientManager.detectInstalledClients.mockResolvedValue([
        { type: 'cursor', isInstalled: true, configPath: '/test/cursor.json', name: 'Cursor' },
        { type: 'gemini', isInstalled: true, configPath: '/test/gemini.json', name: 'Gemini' },
      ]);

      mockConfigEngine.listInstalledServers.mockResolvedValue({
        'test-server': { command: 'npx', args: ['test-package'] },
      });
    });

    it('should show what would be uninstalled without actually uninstalling', async () => {
      await uninstallCommand('test-server', { clients: 'all', dryRun: true });

      expect(mockSpinner.succeed).toHaveBeenCalledWith(
        chalk.green('Dry run completed successfully')
      );
      expect(consoleSpy).toHaveBeenCalledWith(chalk.cyan('Would uninstall from:'));
      expect(mockConfigEngine.uninstallServer).not.toHaveBeenCalled();
      expect(inquirer.prompt).not.toHaveBeenCalled();
    });
  });

  describe('user cancellation', () => {
    beforeEach(() => {
      mockClientManager.detectInstalledClients.mockResolvedValue([
        { type: 'cursor', isInstalled: true, configPath: '/test/cursor.json', name: 'Cursor' },
      ]);

      mockConfigEngine.listInstalledServers.mockResolvedValue({
        'test-server': { command: 'npx', args: ['test-package'] },
      });
    });

    it('should handle user cancellation', async () => {
      (inquirer.prompt as jest.MockedFunction<typeof inquirer.prompt>).mockResolvedValue({ proceed: false });

      await uninstallCommand('test-server', { clients: 'all' });

      expect(consoleSpy).toHaveBeenCalledWith(chalk.yellow('Uninstallation cancelled'));
      expect(mockConfigEngine.uninstallServer).not.toHaveBeenCalled();
    });
  });

  describe('error scenarios', () => {
    it('should handle no supported clients detected', async () => {
      mockClientManager.detectInstalledClients.mockResolvedValue([
        { type: 'cursor', isInstalled: false, configPath: '', name: 'Cursor' },
      ]);

      await uninstallCommand('test-server', { clients: 'all' });

      expect(mockSpinner.fail).toHaveBeenCalledWith(chalk.red('No supported AI clients detected'));
    });

    it('should handle unsupported client type', async () => {
      mockClientManager.isClientSupported.mockReturnValue(false);
      mockClientManager.getSupportedClients.mockReturnValue(['cursor', 'gemini']);

      await uninstallCommand('test-server', { clients: 'invalid-client' });

      expect(mockSpinner.fail).toHaveBeenCalledWith(
        chalk.red('Unsupported client: invalid-client')
      );
      expect(consoleSpy).toHaveBeenCalledWith(chalk.yellow('Supported clients: cursor, gemini'));
    });

    it('should handle client not detected', async () => {
      mockClientManager.isClientSupported.mockReturnValue(true);
      mockClientManager.detectInstalledClients.mockResolvedValue([
        { type: 'cursor', isInstalled: false, configPath: '', name: 'Cursor' },
      ]);

      await uninstallCommand('test-server', { clients: 'cursor' });

      expect(mockSpinner.warn).toHaveBeenCalledWith(
        chalk.yellow("Client 'Cursor' not detected, skipping...")
      );
    });

    it('should handle server not installed on any clients', async () => {
      mockClientManager.detectInstalledClients.mockResolvedValue([
        { type: 'cursor', isInstalled: true, configPath: '/test/cursor.json', name: 'Cursor' },
      ]);

      mockConfigEngine.listInstalledServers.mockResolvedValue({});

      await uninstallCommand('test-server', { clients: 'all' });

      expect(mockSpinner.fail).toHaveBeenCalledWith(
        chalk.red("Server 'test-server' is not installed on any of the specified clients")
      );
    });

    it('should handle config read errors', async () => {
      mockClientManager.detectInstalledClients.mockResolvedValue([
        { type: 'cursor', isInstalled: true, configPath: '/test/cursor.json', name: 'Cursor' },
      ]);

      mockConfigEngine.listInstalledServers.mockRejectedValue(new Error('Config read error'));

      await uninstallCommand('test-server', { clients: 'all' });

      expect(mockSpinner.warn).toHaveBeenCalledWith(
        chalk.yellow('Could not read config for Cursor')
      );
    });

    it('should handle uninstallation errors gracefully', async () => {
      mockClientManager.detectInstalledClients.mockResolvedValue([
        { type: 'cursor', isInstalled: true, configPath: '/test/cursor.json', name: 'Cursor' },
        { type: 'gemini', isInstalled: true, configPath: '/test/gemini.json', name: 'Gemini' },
      ]);

      mockConfigEngine.listInstalledServers.mockResolvedValue({
        'test-server': { command: 'npx', args: ['test-package'] },
      });

      mockConfigEngine.uninstallServer
        .mockResolvedValueOnce() // Success for cursor
        .mockRejectedValueOnce(new Error('Uninstall failed')); // Error for gemini

      (inquirer.prompt as jest.MockedFunction<typeof inquirer.prompt>).mockResolvedValue({ proceed: true });

      await uninstallCommand('test-server', { clients: 'all' });

      expect(mockSpinner.succeed).toHaveBeenCalledWith(chalk.green('Uninstalled from Cursor'));
      expect(mockSpinner.fail).toHaveBeenCalledWith(
        chalk.red('Failed to uninstall from Gemini: Uninstall failed')
      );
      expect(consoleSpy).toHaveBeenCalledWith(chalk.green('  ✓ Successful: 1'));
      expect(consoleSpy).toHaveBeenCalledWith(chalk.red('  ✗ Failed: 1'));
    });

    it('should handle general errors and exit', async () => {
      mockClientManager.detectInstalledClients.mockRejectedValue(new Error('General error'));

      await uninstallCommand('test-server', { clients: 'all' });

      expect(mockSpinner.fail).toHaveBeenCalledWith(chalk.red('Uninstallation failed'));
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('prompt behavior', () => {
    beforeEach(() => {
      mockClientManager.detectInstalledClients.mockResolvedValue([
        { type: 'cursor', isInstalled: true, configPath: '/test/cursor.json', name: 'Cursor' },
        { type: 'gemini', isInstalled: true, configPath: '/test/gemini.json', name: 'Gemini' },
      ]);

      mockConfigEngine.listInstalledServers.mockResolvedValue({
        'test-server': { command: 'npx', args: ['test-package'] },
      });
    });

    it('should show correct confirmation prompt', async () => {
      (inquirer.prompt as jest.MockedFunction<typeof inquirer.prompt>).mockResolvedValue({ proceed: true });

      await uninstallCommand('test-server', { clients: 'all' });

      expect(inquirer.prompt).toHaveBeenCalledWith([
        {
          type: 'confirm',
          name: 'proceed',
          message: "Are you sure you want to uninstall 'test-server'?",
          default: false,
        },
      ]);
    });

    it('should display affected clients before confirmation', async () => {
      (inquirer.prompt as jest.MockedFunction<typeof inquirer.prompt>).mockResolvedValue({ proceed: true });

      await uninstallCommand('test-server', { clients: 'all' });

      expect(consoleSpy).toHaveBeenCalledWith(
        chalk.cyan("About to uninstall 'test-server' from 2 client(s):")
      );
      expect(consoleSpy).toHaveBeenCalledWith(chalk.white('  • Cursor'));
      expect(consoleSpy).toHaveBeenCalledWith(chalk.white('  • Gemini'));
    });
  });

  describe('none of specified clients installed', () => {
    it('should handle when none of specified clients are installed', async () => {
      mockClientManager.isClientSupported.mockReturnValue(true);
      mockClientManager.detectInstalledClients.mockResolvedValue([
        { type: 'cursor', isInstalled: false, configPath: '', name: 'Cursor' },
        { type: 'gemini', isInstalled: false, configPath: '', name: 'Gemini' },
      ]);

      await uninstallCommand('test-server', { clients: 'cursor,gemini' });

      expect(mockSpinner.fail).toHaveBeenCalledWith(
        chalk.red('None of the specified clients are installed')
      );
    });
  });
});
