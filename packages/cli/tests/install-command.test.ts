import { vol } from 'memfs';
import { installCommand } from '../src/commands/install';
import {
  ClientManager,
  ConfigEngine,
  ParameterHandler,
  ServerRegistry,
  CommandValidator,
} from '../src/core/index';
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
    gray: jest.fn((text: string) => text),
  },
  red: jest.fn((text: string) => text),
  green: jest.fn((text: string) => text),
  yellow: jest.fn((text: string) => text),
  cyan: jest.fn((text: string) => text),
  white: jest.fn((text: string) => text),
  blue: jest.fn((text: string) => text),
  magenta: jest.fn((text: string) => text),
  gray: jest.fn((text: string) => text),
}));

describe('installCommand', () => {
  let mockClientManager: jest.Mocked<ClientManager>;
  let mockConfigEngine: jest.Mocked<ConfigEngine>;
  let mockParameterHandler: jest.Mocked<ParameterHandler>;
  let mockServerRegistry: jest.Mocked<ServerRegistry>;
  let mockCommandValidator: jest.Mocked<CommandValidator>;
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

    // Setup mocks
    mockServerRegistry = {
      getServer: jest.fn(),
      getAllServers: jest.fn(),
      validateServer: jest.fn(),
    } as any;

    mockClientManager = {
      detectInstalledClients: jest.fn(),
      isClientSupported: jest.fn(),
      getSupportedClients: jest.fn(),
    } as any;

    mockConfigEngine = {
      installServer: jest.fn(),
    } as any;

    mockParameterHandler = {
      hasParameters: jest.fn(),
      promptForParameters: jest.fn(),
      previewCommand: jest.fn(),
      substituteParameters: jest.fn(),
    } as any;

    mockCommandValidator = {
      validateServerCommands: jest.fn(),
      getInstallationInstructions: jest.fn(),
      getCurrentOS: jest.fn(),
    } as any;

    (ServerRegistry as jest.Mock).mockImplementation(() => mockServerRegistry);
    (ClientManager as jest.Mock).mockImplementation(() => mockClientManager);
    (ConfigEngine as jest.Mock).mockImplementation(() => mockConfigEngine);
    (ParameterHandler as jest.Mock).mockImplementation(() => mockParameterHandler);
    (CommandValidator as jest.Mock).mockImplementation(() => mockCommandValidator);

    // Setup console and process mocks
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    processExitSpy = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    processExitSpy.mockRestore();
  });

  const mockServer = {
    id: 'test-server',
    name: 'Test Server',
    description: 'A test server',
    category: 'utility',
    type: 'stdio',
    difficulty: 'simple',
    requiresAuth: false,
    installation: {
      command: 'npx',
      args: ['test-package'],
    },
    documentation: 'https://example.com',
  };

  const mockClients = [
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
  ];

  describe('successful installation scenarios', () => {
    beforeEach(() => {
      mockServerRegistry.getServer.mockResolvedValue(mockServer);
      mockServerRegistry.validateServer.mockResolvedValue({
        isValid: true,
        errors: [],
        warnings: [],
      });
      mockClientManager.detectInstalledClients.mockResolvedValue(mockClients);
      mockParameterHandler.hasParameters.mockReturnValue(false);
      mockParameterHandler.substituteParameters.mockReturnValue({
        args: ['test-package'],
        env: undefined,
      });
      mockConfigEngine.installServer.mockResolvedValue();
      mockCommandValidator.validateServerCommands.mockReturnValue({
        isValid: true,
        missingCommands: [],
      });
    });

    it('should successfully install to all clients', async () => {
      await installCommand('test-server', { clients: 'all' });

      expect(mockServerRegistry.getServer).toHaveBeenCalledWith('test-server');
      expect(mockClientManager.detectInstalledClients).toHaveBeenCalled();
      expect(mockConfigEngine.installServer).toHaveBeenCalledTimes(2);
      expect(consoleSpy).toHaveBeenCalledWith(chalk.green('  ✓ Successful: 2'));
    });

    it('should successfully install to specific client', async () => {
      mockClientManager.isClientSupported.mockReturnValue(true);

      await installCommand('test-server', { clients: 'cursor' });

      expect(mockConfigEngine.installServer).toHaveBeenCalledTimes(1);
      expect(mockConfigEngine.installServer).toHaveBeenCalledWith(
        '/test/cursor.json',
        'test-server',
        { command: 'npx', args: ['test-package'], env: undefined },
        { backup: undefined, force: undefined }
      );
    });

    it('should handle backup and force options', async () => {
      await installCommand('test-server', {
        clients: 'all',
        backup: true,
        force: true,
      });

      expect(mockConfigEngine.installServer).toHaveBeenCalledWith(
        expect.any(String),
        'test-server',
        expect.any(Object),
        { backup: true, force: true }
      );
    });

    it('should validate commands after successful installation', async () => {
      await installCommand('test-server', { clients: 'all' });

      expect(mockCommandValidator.validateServerCommands).toHaveBeenCalledWith(mockServer);
      expect(consoleSpy).toHaveBeenCalledWith(
        chalk.green('✓ All required commands are available on your system')
      );
    });
  });

  describe('command validation integration', () => {
    beforeEach(() => {
      mockServerRegistry.getServer.mockResolvedValue(mockServer);
      mockServerRegistry.validateServer.mockResolvedValue({
        isValid: true,
        errors: [],
        warnings: [],
      });
      mockClientManager.detectInstalledClients.mockResolvedValue(mockClients);
      mockParameterHandler.hasParameters.mockReturnValue(false);
      mockParameterHandler.substituteParameters.mockReturnValue({
        args: ['test-package'],
        env: undefined,
      });
      mockConfigEngine.installServer.mockResolvedValue();
    });

    it('should show missing command warnings', async () => {
      const missingCommands = [
        {
          command: 'uvx',
          installation: {
            name: 'uv',
            description: 'Python package manager',
            instructions: {
              mac: ['brew install uv'],
              linux: ['pip install uv'],
              windows: ['pip install uv'],
            },
          },
        },
      ];

      mockCommandValidator.validateServerCommands.mockReturnValue({
        isValid: false,
        missingCommands,
      });
      mockCommandValidator.getInstallationInstructions.mockReturnValue([
        '\n📦 Missing command: uvx',
        '   Python package manager',
        '   brew install uv',
      ]);
      mockCommandValidator.getCurrentOS.mockReturnValue('mac');

      await installCommand('test-server', { clients: 'all' });

      expect(consoleSpy).toHaveBeenCalledWith(
        chalk.yellow('\n⚠️  Required commands missing on your system:')
      );
      expect(consoleSpy).toHaveBeenCalledWith(chalk.yellow('\n📦 Missing command: uvx'));
    });

    it('should not show command validation for failed installations', async () => {
      mockConfigEngine.installServer.mockRejectedValue(new Error('Installation failed'));

      await installCommand('test-server', { clients: 'all' });

      expect(mockCommandValidator.validateServerCommands).not.toHaveBeenCalled();
    });
  });

  describe('parameter handling', () => {
    beforeEach(() => {
      mockServerRegistry.getServer.mockResolvedValue(mockServer);
      mockServerRegistry.validateServer.mockResolvedValue({
        isValid: true,
        errors: [],
        warnings: [],
      });
      mockClientManager.detectInstalledClients.mockResolvedValue(mockClients);
      mockConfigEngine.installServer.mockResolvedValue();
      mockCommandValidator.validateServerCommands.mockReturnValue({
        isValid: true,
        missingCommands: [],
      });
    });

    it('should prompt for parameters when server has them', async () => {
      mockParameterHandler.hasParameters.mockReturnValue(true);
      mockParameterHandler.promptForParameters.mockResolvedValue({
        param1: 'value1',
      });
      mockParameterHandler.previewCommand.mockReturnValue('npx test-package --param1 value1');
      mockParameterHandler.substituteParameters.mockReturnValue({
        args: ['test-package', '--param1', 'value1'],
        env: undefined,
      });
      (inquirer.prompt as jest.Mock).mockResolvedValue({ confirm: true });

      await installCommand('test-server', { clients: 'all' });

      expect(mockParameterHandler.promptForParameters).toHaveBeenCalledWith(mockServer);
      expect(mockParameterHandler.previewCommand).toHaveBeenCalledWith(mockServer, {
        param1: 'value1',
      });
      expect(inquirer.prompt).toHaveBeenCalledWith([
        {
          type: 'confirm',
          name: 'confirm',
          message: 'Proceed with this configuration?',
          default: true,
        },
      ]);
    });

    it('should cancel installation if user rejects configuration', async () => {
      mockParameterHandler.hasParameters.mockReturnValue(true);
      mockParameterHandler.promptForParameters.mockResolvedValue({});
      mockParameterHandler.previewCommand.mockReturnValue('npx test-package');
      (inquirer.prompt as jest.Mock).mockResolvedValue({ confirm: false });

      await installCommand('test-server', { clients: 'all' });

      expect(consoleSpy).toHaveBeenCalledWith(chalk.yellow('Installation cancelled'));
      expect(mockConfigEngine.installServer).not.toHaveBeenCalled();
    });
  });

  describe('dry run mode', () => {
    beforeEach(() => {
      mockServerRegistry.getServer.mockResolvedValue(mockServer);
      mockServerRegistry.validateServer.mockResolvedValue({
        isValid: true,
        errors: [],
        warnings: [],
      });
      mockClientManager.detectInstalledClients.mockResolvedValue(mockClients);
      mockParameterHandler.hasParameters.mockReturnValue(false);
      mockParameterHandler.substituteParameters.mockReturnValue({
        args: ['test-package'],
        env: { TEST_ENV: 'value' },
      });
    });

    it('should show installation preview without installing', async () => {
      await installCommand('test-server', { clients: 'all', dryRun: true });

      expect(mockSpinner.succeed).toHaveBeenCalledWith(
        chalk.green('Dry run completed successfully')
      );
      expect(consoleSpy).toHaveBeenCalledWith(chalk.cyan('Would install:'));
      expect(consoleSpy).toHaveBeenCalledWith(chalk.white('  Server: Test Server (test-server)'));
      expect(consoleSpy).toHaveBeenCalledWith(chalk.white('  Command: npx test-package'));
      expect(mockConfigEngine.installServer).not.toHaveBeenCalled();
    });
  });

  describe('error scenarios', () => {
    it('should handle server not found', async () => {
      mockServerRegistry.getServer.mockResolvedValue(null);
      mockServerRegistry.getAllServers.mockResolvedValue([
        { id: 'other-server', description: 'Other server' },
      ]);

      await installCommand('nonexistent-server', { clients: 'all' });

      expect(mockSpinner.fail).toHaveBeenCalledWith(
        chalk.red("Server 'nonexistent-server' not found in registry")
      );
      expect(consoleSpy).toHaveBeenCalledWith(chalk.yellow('\nAvailable servers:'));
    });

    it('should handle no supported clients detected', async () => {
      mockServerRegistry.getServer.mockResolvedValue(mockServer);
      mockClientManager.detectInstalledClients.mockResolvedValue([
        { type: 'cursor', isInstalled: false, configPath: '', name: 'Cursor' },
      ]);

      await installCommand('test-server', { clients: 'all' });

      expect(mockSpinner.fail).toHaveBeenCalledWith(chalk.red('No supported AI clients detected'));
    });

    it('should handle unsupported client type', async () => {
      mockServerRegistry.getServer.mockResolvedValue(mockServer);
      mockClientManager.isClientSupported.mockReturnValue(false);

      await installCommand('test-server', { clients: 'invalid-client' });

      expect(mockSpinner.fail).toHaveBeenCalledWith(
        chalk.red('Unsupported client: invalid-client')
      );
    });

    it('should handle server validation failure', async () => {
      mockServerRegistry.getServer.mockResolvedValue(mockServer);
      mockServerRegistry.validateServer.mockResolvedValue({
        isValid: false,
        errors: ['Invalid configuration'],
        warnings: [],
      });
      mockClientManager.detectInstalledClients.mockResolvedValue(mockClients);

      await installCommand('test-server', { clients: 'all' });

      expect(mockSpinner.fail).toHaveBeenCalledWith(chalk.red('Server validation failed'));
      expect(consoleSpy).toHaveBeenCalledWith(chalk.red('  ✗ Invalid configuration'));
    });

    it('should handle installation errors gracefully', async () => {
      mockServerRegistry.getServer.mockResolvedValue(mockServer);
      mockServerRegistry.validateServer.mockResolvedValue({
        isValid: true,
        errors: [],
        warnings: [],
      });
      mockClientManager.detectInstalledClients.mockResolvedValue(mockClients);
      mockParameterHandler.hasParameters.mockReturnValue(false);
      mockParameterHandler.substituteParameters.mockReturnValue({
        args: ['test-package'],
        env: undefined,
      });

      mockConfigEngine.installServer
        .mockResolvedValueOnce() // Success for first client
        .mockRejectedValueOnce(new Error('Installation failed')); // Error for second client

      await installCommand('test-server', { clients: 'all' });

      expect(mockSpinner.succeed).toHaveBeenCalledWith(chalk.green('Installed to Claude-desktop'));
      expect(mockSpinner.fail).toHaveBeenCalledWith(
        chalk.red('Failed to install to Cursor: Installation failed')
      );
      expect(consoleSpy).toHaveBeenCalledWith(chalk.green('  ✓ Successful: 1'));
      expect(consoleSpy).toHaveBeenCalledWith(chalk.red('  ✗ Failed: 1'));
    });

    it('should handle general errors and exit', async () => {
      mockServerRegistry.getServer.mockRejectedValue(new Error('General error'));

      await installCommand('test-server', { clients: 'all' });

      expect(mockSpinner.fail).toHaveBeenCalledWith(chalk.red('Installation failed'));
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('authentication warnings', () => {
    it('should show authentication warning for servers requiring auth', async () => {
      const authServer = {
        ...mockServer,
        requiresAuth: true,
        installation: {
          command: 'npx',
          args: ['test-package'],
          env: {
            API_KEY: 'value',
          },
        },
      };

      mockServerRegistry.getServer.mockResolvedValue(authServer);
      mockServerRegistry.validateServer.mockResolvedValue({
        isValid: true,
        errors: [],
        warnings: [],
      });
      mockClientManager.detectInstalledClients.mockResolvedValue(mockClients);
      mockParameterHandler.hasParameters.mockReturnValue(false);
      mockParameterHandler.substituteParameters.mockReturnValue({
        args: ['test-package'],
        env: { API_KEY: 'value' },
      });
      mockConfigEngine.installServer.mockResolvedValue();
      mockCommandValidator.validateServerCommands.mockReturnValue({
        isValid: true,
        missingCommands: [],
      });
      (inquirer.prompt as jest.Mock).mockResolvedValue({ proceed: true });

      await installCommand('test-server', { clients: 'all' });

      expect(consoleSpy).toHaveBeenCalledWith(
        chalk.yellow(
          'This server requires authentication. Please ensure environment variables are set:'
        )
      );
      expect(consoleSpy).toHaveBeenCalledWith(chalk.yellow('  API_KEY'));
    });
  });
});
