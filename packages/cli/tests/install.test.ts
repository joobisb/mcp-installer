import '@jest/globals';
import { installCommand } from '../src/commands/install';
import { ClientManager, ConfigEngine, ParameterHandler, ServerRegistry, CommandValidator } from '../src/core/index';
import { ClientType, getClientDisplayName } from '@mcp-installer/shared';
import ora from 'ora';
import inquirer from 'inquirer';

// Mock all dependencies
jest.mock('../src/core/index');
jest.mock('@mcp-installer/shared', () => ({
  ...jest.requireActual('@mcp-installer/shared'),
  getClientDisplayName: jest.fn(),
}));
jest.mock('chalk', () => ({
  red: jest.fn((text) => text),
  green: jest.fn((text) => text),
  yellow: jest.fn((text) => text),
  cyan: jest.fn((text) => text),
  white: jest.fn((text) => text),
  gray: jest.fn((text) => text),
}));
jest.mock('ora');
jest.mock('inquirer');

// Mock console methods to prevent output during tests
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();
const mockProcessExit = jest.spyOn(process, 'exit').mockImplementation(() => {
  throw new Error('process.exit() was called.');
});

describe('Install Command', () => {
  let mockSpinner: any;
  let mockServerRegistry: jest.Mocked<ServerRegistry>;
  let mockClientManager: jest.Mocked<ClientManager>;
  let mockParameterHandler: jest.Mocked<ParameterHandler>;
  let mockConfigEngine: jest.Mocked<ConfigEngine>;
  let mockCommandValidator: jest.Mocked<CommandValidator>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock spinner with chainable methods
    mockSpinner = {
      start: jest.fn().mockReturnThis(),
      stop: jest.fn().mockReturnThis(),
      succeed: jest.fn().mockReturnThis(),
      fail: jest.fn().mockReturnThis(),
      warn: jest.fn().mockReturnThis(),
      text: '',
    };
    (ora as jest.Mock).mockReturnValue(mockSpinner);

    // Create mocked instances of core classes
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

    mockParameterHandler = {
      hasParameters: jest.fn(),
      promptForParameters: jest.fn(),
      previewCommand: jest.fn(),
      substituteParameters: jest.fn(),
    } as any;

    mockConfigEngine = {
      installServer: jest.fn(),
      isServerInstalled: jest.fn(),
    } as any;

    mockCommandValidator = {
      validateServerCommands: jest.fn(),
      promptAndInstallMissingCommands: jest.fn(),
      getInstallationInstructions: jest.fn(),
      getCurrentOS: jest.fn().mockReturnValue('darwin'),
    } as any;

    // Mock constructors to return our mocked instances
    (ServerRegistry as jest.Mock).mockImplementation(() => mockServerRegistry);
    (ClientManager as jest.Mock).mockImplementation(() => mockClientManager);
    (ParameterHandler as jest.Mock).mockImplementation(() => mockParameterHandler);
    (ConfigEngine as jest.Mock).mockImplementation(() => mockConfigEngine);
    (CommandValidator as jest.Mock).mockImplementation(() => mockCommandValidator);
    
    // Mock getClientDisplayName utility
    (getClientDisplayName as jest.Mock).mockImplementation((type: ClientType) => {
      const displayNames: Record<ClientType, string> = {
        'claude-desktop': 'Claude Desktop',
        'claude-code': 'Claude Code',
        'cursor': 'Cursor',
        'gemini': 'Gemini',
        'vscode': 'VS Code',
      };
      return displayNames[type] || type;
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Happy Path Scenarios', () => {
    it('should successfully install a server to all detected clients', async () => {
      // Arrange
      const serverName = 'test-server';
      const options = { clients: 'all' };
      
      const mockServer = {
        id: 'test-server',
        name: 'Test Server',
        description: 'A test server for testing',
        installation: { 
          command: 'node',
          args: ['server.js']
        },
        requiresAuth: false,
      };
      
      const mockClients = [
        { 
          type: 'claude-desktop' as ClientType, 
          isInstalled: true, 
          configExists: true, 
          configPath: '/home/user/.config/claude/claude_desktop_config.json'
        },
        { 
          type: 'cursor' as ClientType, 
          isInstalled: true, 
          configExists: true, 
          configPath: '/home/user/.cursor/mcp_settings.json'
        },
      ];

      // Setup mocks for successful installation
      mockServerRegistry.getServer.mockResolvedValue(mockServer);
      mockClientManager.detectInstalledClients.mockResolvedValue(mockClients);
      mockServerRegistry.validateServer.mockResolvedValue({ 
        isValid: true, 
        errors: [], 
        warnings: [] 
      });
      mockConfigEngine.isServerInstalled.mockResolvedValue(false);
      mockParameterHandler.hasParameters.mockReturnValue(false);
      mockCommandValidator.validateServerCommands.mockReturnValue({ 
        isValid: true, 
        missingCommands: [] 
      });
      mockParameterHandler.substituteParameters.mockReturnValue({ 
        args: ['server.js'], 
        env: {} 
      });
      mockConfigEngine.installServer.mockResolvedValue(undefined);

      // Act
      await installCommand(serverName, options);

      // Assert
      expect(mockServerRegistry.getServer).toHaveBeenCalledWith(serverName);
      expect(mockClientManager.detectInstalledClients).toHaveBeenCalled();
      expect(mockServerRegistry.validateServer).toHaveBeenCalledWith(serverName);
      expect(mockConfigEngine.installServer).toHaveBeenCalledTimes(2);
      expect(mockSpinner.succeed).toHaveBeenCalledWith(
        expect.stringContaining('Installed to Claude Desktop')
      );
      expect(mockSpinner.succeed).toHaveBeenCalledWith(
        expect.stringContaining('Installed to Cursor')
      );
    });

    it('should install to specific clients when specified', async () => {
      // Arrange
      const serverName = 'test-server';
      const options = { clients: 'claude,cursor' };
      
      const mockServer = {
        id: 'test-server',
        name: 'Test Server',
        description: 'A test server',
        installation: { command: 'node', args: ['server.js'] },
        requiresAuth: false,
      };
      
      const mockClients = [
        { 
          type: 'claude-code' as ClientType, 
          isInstalled: true, 
          configExists: true, 
          configPath: '/claude-config'
        },
        { 
          type: 'cursor' as ClientType, 
          isInstalled: true, 
          configExists: true, 
          configPath: '/cursor-config'
        },
      ];

      mockServerRegistry.getServer.mockResolvedValue(mockServer);
      mockClientManager.detectInstalledClients.mockResolvedValue(mockClients);
      mockClientManager.isClientSupported.mockReturnValue(true);
      mockServerRegistry.validateServer.mockResolvedValue({ 
        isValid: true, 
        errors: [], 
        warnings: [] 
      });
      mockConfigEngine.isServerInstalled.mockResolvedValue(false);
      mockParameterHandler.hasParameters.mockReturnValue(false);
      mockCommandValidator.validateServerCommands.mockReturnValue({ 
        isValid: true, 
        missingCommands: [] 
      });
      mockParameterHandler.substituteParameters.mockReturnValue({ 
        args: ['server.js'], 
        env: {} 
      });
      mockConfigEngine.installServer.mockResolvedValue(undefined);

      // Act
      await installCommand(serverName, options);

      // Assert
      expect(mockClientManager.isClientSupported).toHaveBeenCalledWith('claude-code');
      expect(mockClientManager.isClientSupported).toHaveBeenCalledWith('cursor');
      expect(mockConfigEngine.installServer).toHaveBeenCalledTimes(2);
      expect(mockConfigEngine.installServer).toHaveBeenCalledWith(
        '/claude-config',
        'test-server',
        { command: 'node', args: ['server.js'], env: {} },
        { backup: undefined, force: undefined }
      );
    });

    it('should handle dry run mode correctly', async () => {
      // Arrange
      const serverName = 'test-server';
      const options = { clients: 'all', dryRun: true };
      
      const mockServer = {
        id: 'test-server',
        name: 'Test Server',
        description: 'A test server',
        installation: { command: 'node', args: ['server.js'] },
        requiresAuth: false,
      };
      
      const mockClients = [
        { 
          type: 'claude-desktop' as ClientType, 
          isInstalled: true, 
          configExists: true, 
          configPath: '/config'
        },
      ];

      mockServerRegistry.getServer.mockResolvedValue(mockServer);
      mockClientManager.detectInstalledClients.mockResolvedValue(mockClients);
      mockServerRegistry.validateServer.mockResolvedValue({ 
        isValid: true, 
        errors: [], 
        warnings: [] 
      });
      mockConfigEngine.isServerInstalled.mockResolvedValue(false);
      mockParameterHandler.hasParameters.mockReturnValue(false);
      mockCommandValidator.validateServerCommands.mockReturnValue({ 
        isValid: true, 
        missingCommands: [] 
      });
      mockParameterHandler.substituteParameters.mockReturnValue({ 
        args: ['server.js'], 
        env: {} 
      });

      // Act
      await installCommand(serverName, options);

      // Assert
      expect(mockSpinner.succeed).toHaveBeenCalledWith(
        expect.stringContaining('Dry run completed successfully')
      );
      expect(mockConfigEngine.installServer).not.toHaveBeenCalled();
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Would install:')
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Server: Test Server (test-server)')
      );
    });

    it('should handle parameters prompting correctly', async () => {
      // Arrange
      const serverName = 'test-server';
      const options = { clients: 'all' };
      
      const mockServer = {
        id: 'test-server',
        name: 'Test Server',
        description: 'A test server',
        installation: { command: 'node', args: ['server.js'] },
        parameters: [{ name: 'apiKey', required: true, description: 'API Key' }],
        requiresAuth: false,
      };
      
      const mockClients = [
        { 
          type: 'claude-desktop' as ClientType, 
          isInstalled: true, 
          configExists: true, 
          configPath: '/config'
        },
      ];

      mockServerRegistry.getServer.mockResolvedValue(mockServer);
      mockClientManager.detectInstalledClients.mockResolvedValue(mockClients);
      mockServerRegistry.validateServer.mockResolvedValue({ 
        isValid: true, 
        errors: [], 
        warnings: [] 
      });
      mockConfigEngine.isServerInstalled.mockResolvedValue(false);
      mockParameterHandler.hasParameters.mockReturnValue(true);
      mockParameterHandler.promptForParameters.mockResolvedValue({ apiKey: 'test-key-123' });
      mockParameterHandler.previewCommand.mockReturnValue('node server.js --api-key=test-key-123');
      (inquirer.prompt as jest.Mock).mockResolvedValue({ confirm: true });
      mockCommandValidator.validateServerCommands.mockReturnValue({ 
        isValid: true, 
        missingCommands: [] 
      });
      mockParameterHandler.substituteParameters.mockReturnValue({ 
        args: ['server.js', '--api-key=test-key-123'], 
        env: {} 
      });
      mockConfigEngine.installServer.mockResolvedValue(undefined);

      // Act
      await installCommand(serverName, options);

      // Assert
      expect(mockParameterHandler.promptForParameters).toHaveBeenCalledWith(mockServer);
      expect(mockParameterHandler.previewCommand).toHaveBeenCalledWith(
        mockServer, 
        { apiKey: 'test-key-123' }
      );
      expect(inquirer.prompt).toHaveBeenCalledWith([
        expect.objectContaining({
          type: 'confirm',
          name: 'confirm',
          message: 'Proceed with this configuration?',
          default: true,
        })
      ]);
      expect(mockConfigEngine.installServer).toHaveBeenCalledWith(
        '/config',
        'test-server',
        { command: 'node', args: ['server.js', '--api-key=test-key-123'], env: {} },
        { backup: undefined, force: undefined }
      );
    });

    it('should handle backup and force options correctly', async () => {
      // Arrange
      const serverName = 'test-server';
      const options = { clients: 'all', backup: true, force: true };
      
      const mockServer = {
        id: 'test-server',
        name: 'Test Server',
        description: 'A test server',
        installation: { command: 'node', args: ['server.js'] },
        requiresAuth: false,
      };
      
      const mockClients = [
        { 
          type: 'claude-desktop' as ClientType, 
          isInstalled: true, 
          configExists: true, 
          configPath: '/config'
        },
      ];

      mockServerRegistry.getServer.mockResolvedValue(mockServer);
      mockClientManager.detectInstalledClients.mockResolvedValue(mockClients);
      mockServerRegistry.validateServer.mockResolvedValue({ 
        isValid: true, 
        errors: [], 
        warnings: [] 
      });
      mockParameterHandler.hasParameters.mockReturnValue(false);
      mockCommandValidator.validateServerCommands.mockReturnValue({ 
        isValid: true, 
        missingCommands: [] 
      });
      mockParameterHandler.substituteParameters.mockReturnValue({ 
        args: ['server.js'], 
        env: {} 
      });
      mockConfigEngine.installServer.mockResolvedValue(undefined);

      // Act
      await installCommand(serverName, options);

      // Assert
      // With force=true, it should skip the isServerInstalled check
      expect(mockConfigEngine.isServerInstalled).not.toHaveBeenCalled();
      expect(mockConfigEngine.installServer).toHaveBeenCalledWith(
        '/config',
        'test-server',
        { command: 'node', args: ['server.js'], env: {} },
        { backup: true, force: true }
      );
    });

    it('should handle successful dependency installation', async () => {
      // Arrange
      const serverName = 'test-server';
      const options = { clients: 'all' };
      
      const mockServer = {
        id: 'test-server',
        name: 'Test Server',
        description: 'A test server',
        installation: { command: 'python', args: ['server.py'] },
        requiresAuth: false,
      };
      
      const mockClients = [
        { 
          type: 'claude-desktop' as ClientType, 
          isInstalled: true, 
          configExists: true, 
          configPath: '/config'
        },
      ];

      mockServerRegistry.getServer.mockResolvedValue(mockServer);
      mockClientManager.detectInstalledClients.mockResolvedValue(mockClients);
      mockServerRegistry.validateServer.mockResolvedValue({ 
        isValid: true, 
        errors: [], 
        warnings: [] 
      });
      mockConfigEngine.isServerInstalled.mockResolvedValue(false);
      mockParameterHandler.hasParameters.mockReturnValue(false);
      mockCommandValidator.validateServerCommands.mockReturnValue({ 
        isValid: false, 
        missingCommands: [{ 
          command: 'python', 
          installation: { darwin: { allowInstall: true } } 
        }] 
      });
      mockCommandValidator.promptAndInstallMissingCommands.mockResolvedValue({
        success: true,
        userDeclined: false,
        installedCommands: [{ command: 'python' }],
        failedCommands: [],
      });
      mockParameterHandler.substituteParameters.mockReturnValue({ 
        args: ['server.py'], 
        env: {} 
      });
      mockConfigEngine.installServer.mockResolvedValue(undefined);

      // Act
      await installCommand(serverName, options);

      // Assert
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('✅ Dependencies installed! Now proceeding with MCP server configuration...')
      );
      expect(mockConfigEngine.installServer).toHaveBeenCalled();
    });
  });

  describe('Error Conditions', () => {
    it('should handle server not found error', async () => {
      // Arrange
      const serverName = 'nonexistent-server';
      const options = { clients: 'all' };
      
      mockServerRegistry.getServer.mockResolvedValue(null);
      mockServerRegistry.getAllServers.mockResolvedValue([
        { id: 'server1', description: 'Server 1' },
        { id: 'server2', description: 'Server 2' },
      ]);

      // Act
      await installCommand(serverName, options);

      // Assert
      expect(mockSpinner.fail).toHaveBeenCalledWith(
        expect.stringContaining(`Server '${serverName}' not found in registry`)
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Available servers:')
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('server1')
      );
    });

    it('should handle no clients detected error', async () => {
      // Arrange
      const serverName = 'test-server';
      const options = { clients: 'all' };
      
      const mockServer = {
        id: 'test-server',
        name: 'Test Server',
        description: 'A test server',
      };

      mockServerRegistry.getServer.mockResolvedValue(mockServer);
      mockClientManager.detectInstalledClients.mockResolvedValue([]);

      // Act
      await installCommand(serverName, options);

      // Assert
      expect(mockSpinner.fail).toHaveBeenCalledWith(
        expect.stringContaining('No supported AI clients detected')
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Supported clients: Claude Desktop, Claude Code, Cursor, Gemini, VS Code')
      );
    });

    it('should handle unsupported client error', async () => {
      // Arrange
      const serverName = 'test-server';
      const options = { clients: 'unsupported-client' };
      
      const mockServer = {
        id: 'test-server',
        name: 'Test Server',
        description: 'A test server',
      };

      mockServerRegistry.getServer.mockResolvedValue(mockServer);
      mockClientManager.detectInstalledClients.mockResolvedValue([]);
      mockClientManager.isClientSupported.mockReturnValue(false);

      // Act
      await installCommand(serverName, options);

      // Assert
      expect(mockSpinner.fail).toHaveBeenCalledWith(
        expect.stringContaining('Unsupported client: unsupported-client')
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Supported clients: claude, claude-desktop, cursor, gemini')
      );
    });

    it('should handle server validation errors', async () => {  
      // Arrange
      const serverName = 'test-server';
      const options = { clients: 'all' };
      
      const mockServer = {
        id: 'test-server',
        name: 'Test Server',
        description: 'A test server',
      };
      
      const mockClients = [
        { 
          type: 'claude-desktop' as ClientType, 
          isInstalled: true, 
          configExists: true, 
          configPath: '/config'
        },
      ];

      mockServerRegistry.getServer.mockResolvedValue(mockServer);
      mockClientManager.detectInstalledClients.mockResolvedValue(mockClients);
      mockServerRegistry.validateServer.mockResolvedValue({ 
        isValid: false, 
        errors: ['Invalid configuration', 'Missing required field: command'],
        warnings: [] 
      });

      // Act
      await installCommand(serverName, options);

      // Assert
      expect(mockSpinner.fail).toHaveBeenCalledWith(
        expect.stringContaining('Server validation failed')
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('✗ Invalid configuration')
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('✗ Missing required field: command')
      );
    });

    it('should handle installation errors', async () => {
      // Arrange
      const serverName = 'test-server';
      const options = { clients: 'all' };
      
      const mockServer = {
        id: 'test-server',
        name: 'Test Server',
        description: 'A test server',
        installation: { command: 'node', args: ['server.js'] },
        requiresAuth: false,
      };
      
      const mockClients = [
        { 
          type: 'claude-desktop' as ClientType, 
          isInstalled: true, 
          configExists: true, 
          configPath: '/config'
        },
      ];

      mockServerRegistry.getServer.mockResolvedValue(mockServer);
      mockClientManager.detectInstalledClients.mockResolvedValue(mockClients);
      mockServerRegistry.validateServer.mockResolvedValue({ 
        isValid: true, 
        errors: [], 
        warnings: [] 
      });
      mockConfigEngine.isServerInstalled.mockResolvedValue(false);
      mockParameterHandler.hasParameters.mockReturnValue(false);
      mockCommandValidator.validateServerCommands.mockReturnValue({ 
        isValid: true, 
        missingCommands: [] 
      });
      mockParameterHandler.substituteParameters.mockReturnValue({ 
        args: ['server.js'], 
        env: {} 
      });
      mockConfigEngine.installServer.mockRejectedValue(new Error('Permission denied writing to config file'));

      // Act
      await installCommand(serverName, options);

      // Assert
      expect(mockSpinner.fail).toHaveBeenCalledWith(
        expect.stringContaining('Failed to install to Claude Desktop: Permission denied writing to config file')
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Installation Summary:')
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('✓ Successful: 0')
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('✗ Failed: 1')
      );
    });

    it('should handle dependency installation user decline', async () => {
      // Arrange
      const serverName = 'test-server';
      const options = { clients: 'all' };
      
      const mockServer = {
        id: 'test-server',
        name: 'Test Server',
        description: 'A test server',
        installation: { command: 'python', args: ['server.py'] },
        requiresAuth: false,
      };
      
      const mockClients = [
        { 
          type: 'claude-desktop' as ClientType, 
          isInstalled: true, 
          configExists: true, 
          configPath: '/config'
        },
      ];

      mockServerRegistry.getServer.mockResolvedValue(mockServer);
      mockClientManager.detectInstalledClients.mockResolvedValue(mockClients);
      mockServerRegistry.validateServer.mockResolvedValue({ 
        isValid: true, 
        errors: [], 
        warnings: [] 
      });
      mockConfigEngine.isServerInstalled.mockResolvedValue(false);
      mockParameterHandler.hasParameters.mockReturnValue(false);
      mockCommandValidator.validateServerCommands.mockReturnValue({ 
        isValid: false, 
        missingCommands: [{ 
          command: 'python', 
          installation: { darwin: { allowInstall: true } } 
        }] 
      });
      mockCommandValidator.promptAndInstallMissingCommands.mockResolvedValue({
        success: false,
        userDeclined: true,
        installedCommands: [],
        failedCommands: [],
      });
      mockCommandValidator.getInstallationInstructions.mockReturnValue([
        'brew install python',
        'apt-get install python3'
      ]);

      // Act
      await installCommand(serverName, options);

      // Assert
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('❌ Installation cancelled - dependency installation declined.')
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Manual installation instructions:')
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('brew install python')
      );
    });

    it('should handle user declining parameter confirmation', async () => {
      // Arrange
      const serverName = 'test-server';
      const options = { clients: 'all' };
      
      const mockServer = {
        id: 'test-server',
        name: 'Test Server',
        description: 'A test server',
        installation: { command: 'node', args: ['server.js'] },
        parameters: [{ name: 'apiKey', required: true }],
        requiresAuth: false,
      };
      
      const mockClients = [
        { 
          type: 'claude-desktop' as ClientType, 
          isInstalled: true, 
          configExists: true, 
          configPath: '/config'
        },
      ];

      mockServerRegistry.getServer.mockResolvedValue(mockServer);
      mockClientManager.detectInstalledClients.mockResolvedValue(mockClients);
      mockServerRegistry.validateServer.mockResolvedValue({ 
        isValid: true, 
        errors: [], 
        warnings: [] 
      });
      mockConfigEngine.isServerInstalled.mockResolvedValue(false);
      mockParameterHandler.hasParameters.mockReturnValue(true);
      mockParameterHandler.promptForParameters.mockResolvedValue({ apiKey: 'test-key' });
      mockParameterHandler.previewCommand.mockReturnValue('node server.js --api-key=test-key');
      (inquirer.prompt as jest.Mock).mockResolvedValue({ confirm: false });

      // Act
      await installCommand(serverName, options);

      // Assert
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Installation cancelled')
      );
      expect(mockConfigEngine.installServer).not.toHaveBeenCalled();
    });

    it('should handle unexpected errors with process exit', async () => {
      // Arrange
      const serverName = 'test-server';
      const options = { clients: 'all' };
      
      mockServerRegistry.getServer.mockRejectedValue(new Error('Database connection failed'));

      // Act & Assert
      await expect(installCommand(serverName, options)).rejects.toThrow('process.exit() was called.');
      
      expect(mockSpinner.fail).toHaveBeenCalledWith(
        expect.stringContaining('Installation failed')
      );
      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('Database connection failed')
      );
      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });
  });

  describe('Edge Cases and Complex Scenarios', () => {
    it('should handle already installed servers without force flag', async () => {
      // Arrange
      const serverName = 'test-server';
      const options = { clients: 'all' };
      
      const mockServer = {
        id: 'test-server',
        name: 'Test Server',
        description: 'A test server',
        installation: { command: 'node', args: ['server.js'] },
        requiresAuth: false,
      };
      
      const mockClients = [
        { 
          type: 'claude-desktop' as ClientType, 
          isInstalled: true, 
          configExists: true, 
          configPath: '/config'
        },
      ];

      mockServerRegistry.getServer.mockResolvedValue(mockServer);
      mockClientManager.detectInstalledClients.mockResolvedValue(mockClients);
      mockServerRegistry.validateServer.mockResolvedValue({ 
        isValid: true, 
        errors: [], 
        warnings: [] 
      });
      mockConfigEngine.isServerInstalled.mockResolvedValue(true);

      // Act
      await installCommand(serverName, options);

      // Assert
      expect(mockSpinner.warn).toHaveBeenCalledWith(
        expect.stringContaining(`Server 'Test Server' is already installed on all target clients:`)
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('• Claude Desktop')
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Use --force to overwrite existing installation.')
      );
      expect(mockConfigEngine.installServer).not.toHaveBeenCalled();
    });

    it('should handle servers requiring authentication', async () => {
      // Arrange
      const serverName = 'test-server';
      const options = { clients: 'all' };
      
      const mockServer = {
        id: 'test-server',
        name: 'Test Server',
        description: 'A test server',
        installation: { 
          command: 'node', 
          args: ['server.js'],
          env: { API_KEY: 'required', SECRET_TOKEN: 'needed' }
        },
        requiresAuth: true,
      };
      
      const mockClients = [
        { 
          type: 'claude-desktop' as ClientType, 
          isInstalled: true, 
          configExists: true, 
          configPath: '/config'
        },
      ];

      mockServerRegistry.getServer.mockResolvedValue(mockServer);
      mockClientManager.detectInstalledClients.mockResolvedValue(mockClients);
      mockServerRegistry.validateServer.mockResolvedValue({ 
        isValid: true, 
        errors: [], 
        warnings: [] 
      });
      mockConfigEngine.isServerInstalled.mockResolvedValue(false);
      mockParameterHandler.hasParameters.mockReturnValue(false);
      mockCommandValidator.validateServerCommands.mockReturnValue({ 
        isValid: true, 
        missingCommands: [] 
      });
      (inquirer.prompt as jest.Mock).mockResolvedValue({ proceed: true });
      mockParameterHandler.substituteParameters.mockReturnValue({ 
        args: ['server.js'], 
        env: { API_KEY: 'required', SECRET_TOKEN: 'needed' } 
      });
      mockConfigEngine.installServer.mockResolvedValue(undefined);

      // Act
      await installCommand(serverName, options);

      // Assert
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('This server requires authentication. Please ensure environment variables are set:')
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('API_KEY')
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('SECRET_TOKEN')
      );
      expect(inquirer.prompt).toHaveBeenCalledWith([
        expect.objectContaining({
          type: 'confirm',
          name: 'proceed',
          message: 'Continue with installation?',
          default: true,
        })
      ]);
    });

    it('should handle mixed success and failure results with proper summary', async () => {
      // Arrange
      const serverName = 'test-server';
      const options = { clients: 'all' };
      
      const mockServer = {
        id: 'test-server',
        name: 'Test Server',
        description: 'A test server',
        installation: { command: 'node', args: ['server.js'] },
        requiresAuth: false,
        documentation: 'https://example.com/docs',
      };
      
      const mockClients = [
        { 
          type: 'claude-desktop' as ClientType, 
          isInstalled: true, 
          configExists: true, 
          configPath: '/config1'
        },
        { 
          type: 'cursor' as ClientType, 
          isInstalled: true, 
          configExists: true, 
          configPath: '/config2'
        },
        { 
          type: 'vscode' as ClientType, 
          isInstalled: true, 
          configExists: true, 
          configPath: '/config3'
        },
      ];

      mockServerRegistry.getServer.mockResolvedValue(mockServer);
      mockClientManager.detectInstalledClients.mockResolvedValue(mockClients);
      mockServerRegistry.validateServer.mockResolvedValue({ 
        isValid: true, 
        errors: [], 
        warnings: [] 
      });
      mockConfigEngine.isServerInstalled.mockResolvedValue(false);
      mockParameterHandler.hasParameters.mockReturnValue(false);
      mockCommandValidator.validateServerCommands.mockReturnValue({ 
        isValid: true, 
        missingCommands: [] 
      });
      mockParameterHandler.substituteParameters.mockReturnValue({ 
        args: ['server.js'], 
        env: {} 
      });
      
      // First succeeds, second fails, third succeeds
      mockConfigEngine.installServer
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('Config file locked'))
        .mockResolvedValueOnce(undefined);

      // Act
      await installCommand(serverName, options);

      // Assert
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Installation Summary:')
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('✓ Successful: 2')
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('✗ Failed: 1')
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Next steps:')
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Documentation: https://example.com/docs')
      );
    });

    it('should handle dry run with missing dependencies', async () => {
      // Arrange
      const serverName = 'test-server';
      const options = { clients: 'all', dryRun: true };
      
      const mockServer = {
        id: 'test-server',
        name: 'Test Server',
        description: 'A test server',
        installation: { command: 'python', args: ['server.py'] },
        requiresAuth: false,
      };
      
      const mockClients = [
        { 
          type: 'claude-desktop' as ClientType, 
          isInstalled: true, 
          configExists: true, 
          configPath: '/config'
        },
      ];

      mockServerRegistry.getServer.mockResolvedValue(mockServer);
      mockClientManager.detectInstalledClients.mockResolvedValue(mockClients);
      mockServerRegistry.validateServer.mockResolvedValue({ 
        isValid: true, 
        errors: [], 
        warnings: [] 
      });
      mockConfigEngine.isServerInstalled.mockResolvedValue(false);
      mockParameterHandler.hasParameters.mockReturnValue(false);
      mockCommandValidator.validateServerCommands.mockReturnValue({ 
        isValid: false, 
        missingCommands: [{ 
          command: 'python', 
          installation: { darwin: { allowInstall: true } } 
        }] 
      });
      mockParameterHandler.substituteParameters.mockReturnValue({ 
        args: ['server.py'], 
        env: {} 
      });

      // Act
      await installCommand(serverName, options);

      // Assert
      expect(mockSpinner.succeed).toHaveBeenCalledWith(
        expect.stringContaining('Dry run completed successfully')
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('🔧 Dependency check (dry run):')
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('• python: missing (would attempt auto-install)')
      );
    });

    it('should handle client not detected but requested', async () => {
      // Arrange
      const serverName = 'test-server';
      const options = { clients: 'claude,nonexistent-client' };
      
      const mockServer = {
        id: 'test-server',
        name: 'Test Server',
        description: 'A test server',
      };
      
      const mockClients = [
        { 
          type: 'claude-code' as ClientType, 
          isInstalled: true, 
          configExists: true, 
          configPath: '/claude-config'
        },
      ];

      mockServerRegistry.getServer.mockResolvedValue(mockServer);
      mockClientManager.detectInstalledClients.mockResolvedValue(mockClients);
      mockClientManager.isClientSupported
        .mockReturnValueOnce(true)  // claude is supported
        .mockReturnValueOnce(true); // nonexistent-client is technically supported but not installed

      // Act
      await installCommand(serverName, options);

      // Assert
      expect(mockSpinner.warn).toHaveBeenCalledWith(
        expect.stringContaining(`Client 'Gemini' not detected, skipping...`)
      );
    });

    it('should display next steps with installation summary', async () => {
      // Arrange
      const serverName = 'test-server';
      const options = { clients: 'all' };
      
      const mockServer = {
        id: 'test-server',
        name: 'Test Server',
        description: 'A test server',
        installation: { command: 'node', args: ['server.js'] },
        requiresAuth: false,
      };
      
      const mockClients = [
        { 
          type: 'claude-desktop' as ClientType, 
          isInstalled: true, 
          configExists: true, 
          configPath: '/config'
        },
      ];

      mockServerRegistry.getServer.mockResolvedValue(mockServer);
      mockClientManager.detectInstalledClients.mockResolvedValue(mockClients);
      mockServerRegistry.validateServer.mockResolvedValue({ 
        isValid: true, 
        errors: [], 
        warnings: [] 
      });
      mockConfigEngine.isServerInstalled.mockResolvedValue(false);
      mockParameterHandler.hasParameters.mockReturnValue(false);
      mockCommandValidator.validateServerCommands.mockReturnValue({ 
        isValid: true, 
        missingCommands: [] 
      });
      mockParameterHandler.substituteParameters.mockReturnValue({ 
        args: ['server.js'], 
        env: {} 
      });
      mockConfigEngine.installServer.mockResolvedValue(undefined);

      // Act
      await installCommand(serverName, options);

      // Assert
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('✅ Installation completed with all dependencies verified')
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Next steps:')
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('1. If you are using Claude Desktop, restart it to load the new MCP server')
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining(`2. The Test Server server should now be available`)
      );
    });
  });
});