import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import chalk from 'chalk';
import ora from 'ora';
import Table from 'cli-table3';
import { listCommand } from '../src/commands/list.js';
import { ClientManager, ConfigEngine, ServerRegistry } from '../core/index.js';
import { ClientType, getClientDisplayName } from '@mcp-installer/shared';

// Mock dependencies
jest.mock('chalk');
jest.mock('ora');
jest.mock('cli-table3');
jest.mock('../src/core/index.js');
jest.mock('@mcp-installer/shared');

const mockChalk = chalk as jest.Mocked<typeof chalk>;
const mockOra = ora as jest.MockedFunction<typeof ora>;
const mockTable = Table as jest.MockedClass<typeof Table>;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const mockClientManager = ClientManager as jest.MockedClass<typeof ClientManager>;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const mockConfigEngine = ConfigEngine as jest.MockedClass<typeof ConfigEngine>;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const mockServerRegistry = ServerRegistry as jest.MockedClass<typeof ServerRegistry>;
const mockGetClientDisplayName = getClientDisplayName as jest.MockedFunction<typeof getClientDisplayName>;

describe('listCommand', () => {
  let mockSpinner: any;
  let mockConsoleLog: jest.SpyInstance;
  let mockConsoleError: jest.SpyInstance;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let mockProcessExit: jest.SpyInstance;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Setup console mocks
    mockConsoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});
    mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockProcessExit = jest.spyOn(process, 'exit').mockImplementation((code?: number) => {
      throw new Error(`process.exit(${code})`);
    });

    // Setup spinner mock
    mockSpinner = {
      start: jest.fn().mockReturnThis(),
      succeed: jest.fn().mockReturnThis(),
      fail: jest.fn().mockReturnThis(),
      text: '',
    };
    mockOra.mockReturnValue(mockSpinner);

    // Setup chalk mocks
    mockChalk.green = jest.fn().mockImplementation((text) => text);
    mockChalk.yellow = jest.fn().mockImplementation((text) => text);
    mockChalk.red = jest.fn().mockImplementation((text) => text);
    mockChalk.cyan = jest.fn().mockImplementation((text) => text);
    mockChalk.bold = jest.fn().mockImplementation((text) => text);
    mockChalk.dim = jest.fn().mockImplementation((text) => text);

    // Setup Table mock
    const mockTableInstance = {
      push: jest.fn(),
      toString: jest.fn().mockReturnValue('mocked table'),
    };
    mockTable.mockImplementation(() => mockTableInstance);

    // Setup default mock implementations
    mockGetClientDisplayName.mockReturnValue('Claude Desktop');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('happy path scenarios', () => {
    it('should list available servers when no options provided', async () => {
      const mockServers = [
        {
          id: 'test-server',
          name: 'Test Server',
          category: 'development',
          type: 'stdio',
          requiresAuth: false,
        },
      ];

      const mockServerRegistry = {
        getAllServers: jest.fn().mockResolvedValue(mockServers),
        getCategories: jest.fn().mockResolvedValue(['development']),
        getServersByCategory: jest.fn().mockResolvedValue(mockServers),
        getServerStats: jest.fn().mockResolvedValue({ total: 1 }),
      };

      const mockClientManager = {
        detectInstalledClients: jest.fn().mockResolvedValue([]),
      };

      mockServerRegistry.mockImplementation(() => mockServerRegistry);
      mockClientManager.mockImplementation(() => mockClientManager);

      await listCommand({});

      expect(mockSpinner.start).toHaveBeenCalledWith('Loading...');
      expect(mockSpinner.succeed).toHaveBeenCalledWith('Available MCP Servers:');
      expect(mockConsoleLog).toHaveBeenCalled();
    });

    it('should list available servers when available option is true', async () => {
      const mockServers = [
        {
          id: 'test-server',
          name: 'Test Server',
          category: 'development',
          type: 'stdio',
          requiresAuth: false,
        },
      ];

      const mockServerRegistry = {
        getAllServers: jest.fn().mockResolvedValue(mockServers),
        getCategories: jest.fn().mockResolvedValue(['development']),
        getServersByCategory: jest.fn().mockResolvedValue(mockServers),
        getServerStats: jest.fn().mockResolvedValue({ total: 1 }),
      };

      mockServerRegistry.mockImplementation(() => mockServerRegistry);

      await listCommand({ available: true });

      expect(mockServerRegistry.getAllServers).toHaveBeenCalled();
      expect(mockSpinner.succeed).toHaveBeenCalledWith('Available MCP Servers:');
    });

    it('should list installed servers when installed option is true', async () => {
      const mockClients = [
        {
          type: 'claude-desktop' as ClientType,
          isInstalled: true,
          configPath: '/path/to/config',
        },
      ];

      const mockInstalledServers = {
        'test-server': {
          command: 'npx',
          args: ['test-server'],
          env: { API_KEY: 'test' },
        },
      };

      const mockClientManager = {
        detectInstalledClients: jest.fn().mockResolvedValue(mockClients),
      };

      const mockConfigEngine = {
        listInstalledServers: jest.fn().mockResolvedValue(mockInstalledServers),
      };

      mockClientManager.mockImplementation(() => mockClientManager);
      mockConfigEngine.mockImplementation(() => mockConfigEngine);

      await listCommand({ installed: true });

      expect(mockClientManager.detectInstalledClients).toHaveBeenCalled();
      expect(mockConfigEngine.listInstalledServers).toHaveBeenCalledWith('/path/to/config');
      expect(mockSpinner.succeed).toHaveBeenCalledWith('Installed MCP Servers:');
    });

    it('should filter by specific client when client option is provided', async () => {
      const mockClients = [
        {
          type: 'claude-desktop' as ClientType,
          isInstalled: true,
          configPath: '/path/to/config',
        },
      ];

      const mockClientManager = {
        detectInstalledClients: jest.fn().mockResolvedValue(mockClients),
        isClientSupported: jest.fn().mockReturnValue(true),
        getSupportedClients: jest.fn().mockReturnValue(['claude-desktop']),
      };

      const mockConfigEngine = {
        listInstalledServers: jest.fn().mockResolvedValue({}),
      };

      mockClientManager.mockImplementation(() => mockClientManager);
      mockConfigEngine.mockImplementation(() => mockConfigEngine);

      await listCommand({ installed: true, client: 'claude-desktop' });

      expect(mockClientManager.isClientSupported).toHaveBeenCalledWith('claude-desktop');
      expect(mockConfigEngine.listInstalledServers).toHaveBeenCalledWith('/path/to/config');
    });

    it('should display servers grouped by category', async () => {
      const mockServers = [
        {
          id: 'dev-server',
          name: 'Dev Server',
          category: 'development',
          type: 'stdio',
          requiresAuth: false,
        },
        {
          id: 'util-server',
          name: 'Util Server',
          category: 'utility',
          type: 'stdio',
          requiresAuth: true,
        },
      ];

      const mockServerRegistry = {
        getAllServers: jest.fn().mockResolvedValue(mockServers),
        getCategories: jest.fn().mockResolvedValue(['development', 'utility']),
        getServersByCategory: jest.fn()
          .mockResolvedValueOnce([mockServers[0]])
          .mockResolvedValueOnce([mockServers[1]]),
        getServerStats: jest.fn().mockResolvedValue({ total: 2 }),
      };

      mockServerRegistry.mockImplementation(() => mockServerRegistry);

      await listCommand({ available: true });

      expect(mockServerRegistry.getCategories).toHaveBeenCalled();
      expect(mockServerRegistry.getServersByCategory).toHaveBeenCalledWith('development');
      expect(mockServerRegistry.getServersByCategory).toHaveBeenCalledWith('utility');
    });

    it('should show authentication requirements in server table', async () => {
      const mockServers = [
        {
          id: 'auth-server',
          name: 'Auth Server',
          category: 'development',
          type: 'stdio',
          requiresAuth: true,
        },
      ];

      const mockServerRegistry = {
        getAllServers: jest.fn().mockResolvedValue(mockServers),
        getCategories: jest.fn().mockResolvedValue(['development']),
        getServersByCategory: jest.fn().mockResolvedValue(mockServers),
        getServerStats: jest.fn().mockResolvedValue({ total: 1 }),
      };

      mockServerRegistry.mockImplementation(() => mockServerRegistry);

      await listCommand({ available: true });

      expect(mockChalk.yellow).toHaveBeenCalledWith('🔐 Yes');
    });
  });

  describe('edge cases', () => {
    it('should handle no available servers', async () => {
      const mockServerRegistry = {
        getAllServers: jest.fn().mockResolvedValue([]),
        getCategories: jest.fn().mockResolvedValue([]),
        getServersByCategory: jest.fn().mockResolvedValue([]),
        getServerStats: jest.fn().mockResolvedValue({ total: 0 }),
      };

      mockServerRegistry.mockImplementation(() => mockServerRegistry);

      await listCommand({ available: true });

      expect(mockConsoleLog).toHaveBeenCalledWith('  No servers found in registry');
    });

    it('should handle no installed clients', async () => {
      const mockClientManager = {
        detectInstalledClients: jest.fn().mockResolvedValue([]),
      };

      mockClientManager.mockImplementation(() => mockClientManager);

      await listCommand({ installed: true });

      expect(mockSpinner.succeed).toHaveBeenCalledWith('No supported AI clients detected');
      expect(mockConsoleLog).toHaveBeenCalledWith('Supported clients: Claude Desktop, Cursor, Gemini', 'VSCode');
    });

    it('should handle unsupported client type', async () => {
      const mockClientManager = {
        isClientSupported: jest.fn().mockReturnValue(false),
        getSupportedClients: jest.fn().mockReturnValue(['claude-desktop', 'cursor']),
      };

      mockClientManager.mockImplementation(() => mockClientManager);

      await listCommand({ installed: true, client: 'unsupported-client' });

      expect(mockSpinner.fail).toHaveBeenCalledWith('Unsupported client: unsupported-client');
      expect(mockConsoleLog).toHaveBeenCalledWith('Supported clients: claude-desktop, cursor');
    });

    it('should handle client not detected', async () => {
      const mockClients = [
        {
          type: 'claude-desktop' as ClientType,
          isInstalled: false,
          configPath: '',
        },
      ];

      const mockClientManager = {
        detectInstalledClients: jest.fn().mockResolvedValue(mockClients),
        isClientSupported: jest.fn().mockReturnValue(true),
      };

      mockClientManager.mockImplementation(() => mockClientManager);
      mockGetClientDisplayName.mockReturnValue('Claude Desktop');

      await listCommand({ installed: true, client: 'claude-desktop' });

      expect(mockSpinner.fail).toHaveBeenCalledWith("Client 'Claude Desktop' not detected");
    });

    it('should handle no installed servers for client', async () => {
      const mockClients = [
        {
          type: 'claude-desktop' as ClientType,
          isInstalled: true,
          configPath: '/path/to/config',
        },
      ];

      const mockClientManager = {
        detectInstalledClients: jest.fn().mockResolvedValue(mockClients),
      };

      const mockConfigEngine = {
        listInstalledServers: jest.fn().mockResolvedValue({}),
      };

      mockClientManager.mockImplementation(() => mockClientManager);
      mockConfigEngine.mockImplementation(() => mockConfigEngine);

      await listCommand({ installed: true });

      expect(mockConsoleLog).toHaveBeenCalledWith('  No MCP servers installed');
    });

    it('should handle config reading errors', async () => {
      const mockClients = [
        {
          type: 'claude-desktop' as ClientType,
          isInstalled: true,
          configPath: '/path/to/config',
        },
      ];

      const mockClientManager = {
        detectInstalledClients: jest.fn().mockResolvedValue(mockClients),
      };

      const mockConfigEngine = {
        listInstalledServers: jest.fn().mockRejectedValue(new Error('Config read error')),
      };

      mockClientManager.mockImplementation(() => mockClientManager);
      mockConfigEngine.mockImplementation(() => mockConfigEngine);

      await listCommand({ installed: true });

      expect(mockConsoleLog).toHaveBeenCalledWith('  Error reading config: Config read error');
    });

    it('should truncate long command displays', async () => {
      const mockClients = [
        {
          type: 'claude-desktop' as ClientType,
          isInstalled: true,
          configPath: '/path/to/config',
        },
      ];

      const mockInstalledServers = {
        'test-server': {
          command: 'npx',
          args: ['very-long-command-name-that-exceeds-limit', '--with', '--many', '--arguments'],
          env: {},
        },
      };

      const mockClientManager = {
        detectInstalledClients: jest.fn().mockResolvedValue(mockClients),
      };

      const mockConfigEngine = {
        listInstalledServers: jest.fn().mockResolvedValue(mockInstalledServers),
      };

      mockClientManager.mockImplementation(() => mockClientManager);
      mockConfigEngine.mockImplementation(() => mockConfigEngine);

      await listCommand({ installed: true });

      expect(mockConsoleLog).toHaveBeenCalled();
    });

    it('should handle servers with no environment variables', async () => {
      const mockClients = [
        {
          type: 'claude-desktop' as ClientType,
          isInstalled: true,
          configPath: '/path/to/config',
        },
      ];

      const mockInstalledServers = {
        'test-server': {
          command: 'npx',
          args: ['test-server'],
        },
      };

      const mockClientManager = {
        detectInstalledClients: jest.fn().mockResolvedValue(mockClients),
      };

      const mockConfigEngine = {
        listInstalledServers: jest.fn().mockResolvedValue(mockInstalledServers),
      };

      mockClientManager.mockImplementation(() => mockClientManager);
      mockConfigEngine.mockImplementation(() => mockConfigEngine);

      await listCommand({ installed: true });

      expect(mockChalk.dim).toHaveBeenCalledWith('none');
    });
  });

  describe('failure conditions', () => {
    it('should handle server registry loading errors', async () => {
      const mockServerRegistry = {
        getAllServers: jest.fn().mockRejectedValue(new Error('Registry error')),
      };

      mockServerRegistry.mockImplementation(() => mockServerRegistry);

      await expect(async () => {
        await listCommand({ available: true });
      }).rejects.toThrow('process.exit(1)');

      expect(mockSpinner.fail).toHaveBeenCalledWith('Failed to list servers');
      expect(mockConsoleError).toHaveBeenCalledWith('Registry error');
    });

    it('should handle client detection errors', async () => {
      const mockClientManager = {
        detectInstalledClients: jest.fn().mockRejectedValue(new Error('Client detection error')),
      };

      mockClientManager.mockImplementation(() => mockClientManager);

      await expect(async () => {
        await listCommand({ installed: true });
      }).rejects.toThrow('process.exit(1)');

      expect(mockSpinner.fail).toHaveBeenCalledWith('Failed to list servers');
      expect(mockConsoleError).toHaveBeenCalledWith('Client detection error');
    });

    it('should handle unknown errors', async () => {
      const mockServerRegistry = {
        getAllServers: jest.fn().mockRejectedValue('Unknown error'),
      };

      mockServerRegistry.mockImplementation(() => mockServerRegistry);

      await expect(async () => {
        await listCommand({ available: true });
      }).rejects.toThrow('process.exit(1)');

      expect(mockConsoleError).toHaveBeenCalledWith('Unknown error');
    });
  });

  describe('output formatting', () => {
    it('should format server tables with proper structure', async () => {
      const mockServers = [
        {
          id: 'test-server',
          name: 'Test Server',
          category: 'development',
          type: 'stdio',
          requiresAuth: false,
        },
      ];

      const mockServerRegistry = {
        getAllServers: jest.fn().mockResolvedValue(mockServers),
        getCategories: jest.fn().mockResolvedValue(['development']),
        getServersByCategory: jest.fn().mockResolvedValue(mockServers),
        getServerStats: jest.fn().mockResolvedValue({ total: 1 }),
      };

      mockServerRegistry.mockImplementation(() => mockServerRegistry);

      await listCommand({ available: true });

      expect(mockTable).toHaveBeenCalledWith(
        expect.objectContaining({
          head: expect.arrayContaining([expect.any(String)]),
          colWidths: [35, 20, 12],
          style: expect.objectContaining({
            head: ['cyan'],
            border: ['grey'],
          }),
        })
      );
    });

    it('should format installed server tables correctly', async () => {
      const mockClients = [
        {
          type: 'claude-desktop' as ClientType,
          isInstalled: true,
          configPath: '/path/to/config',
        },
      ];

      const mockInstalledServers = {
        'test-server': {
          command: 'npx',
          args: ['test-server'],
          env: { API_KEY: 'test' },
        },
      };

      const mockClientManager = {
        detectInstalledClients: jest.fn().mockResolvedValue(mockClients),
      };

      const mockConfigEngine = {
        listInstalledServers: jest.fn().mockResolvedValue(mockInstalledServers),
      };

      mockClientManager.mockImplementation(() => mockClientManager);
      mockConfigEngine.mockImplementation(() => mockConfigEngine);

      await listCommand({ installed: true });

      expect(mockTable).toHaveBeenCalledWith(
        expect.objectContaining({
          head: expect.arrayContaining([
            expect.stringContaining('Server Name'),
            expect.stringContaining('Command'),
            expect.stringContaining('Environment Variables'),
          ]),
          colWidths: [25, 35, 30],
        })
      );
    });

    it('should display total statistics correctly', async () => {
      const mockServers = [
        {
          id: 'test-server',
          name: 'Test Server',
          category: 'development',
          type: 'stdio',
          requiresAuth: false,
        },
      ];

      const mockServerRegistry = {
        getAllServers: jest.fn().mockResolvedValue(mockServers),
        getCategories: jest.fn().mockResolvedValue(['development']),
        getServersByCategory: jest.fn().mockResolvedValue(mockServers),
        getServerStats: jest.fn().mockResolvedValue({ total: 1 }),
      };

      mockServerRegistry.mockImplementation(() => mockServerRegistry);

      await listCommand({ available: true });

      expect(mockConsoleLog).toHaveBeenCalledWith('\nTotal: 1 servers available');
    });

    it('should show separator when displaying both available and installed', async () => {
      const mockServers = [
        {
          id: 'test-server',
          name: 'Test Server',
          category: 'development',
          type: 'stdio',
          requiresAuth: false,
        },
      ];

      const mockClients = [
        {
          type: 'claude-desktop' as ClientType,
          isInstalled: true,
          configPath: '/path/to/config',
        },
      ];

      const mockServerRegistry = {
        getAllServers: jest.fn().mockResolvedValue(mockServers),
        getCategories: jest.fn().mockResolvedValue(['development']),
        getServersByCategory: jest.fn().mockResolvedValue(mockServers),
        getServerStats: jest.fn().mockResolvedValue({ total: 1 }),
      };

      const mockClientManager = {
        detectInstalledClients: jest.fn().mockResolvedValue(mockClients),
      };

      const mockConfigEngine = {
        listInstalledServers: jest.fn().mockResolvedValue({}),
      };

      mockServerRegistry.mockImplementation(() => mockServerRegistry);
      mockClientManager.mockImplementation(() => mockClientManager);
      mockConfigEngine.mockImplementation(() => mockConfigEngine);

      await listCommand({});

      expect(mockConsoleLog).toHaveBeenCalledWith('\n' + '═'.repeat(80));
    });
  });

  describe('integration scenarios', () => {
    it('should handle mixed available and installed listing', async () => {
      const mockServers = [
        {
          id: 'available-server',
          name: 'Available Server',
          category: 'development',
          type: 'stdio',
          requiresAuth: false,
        },
      ];

      const mockClients = [
        {
          type: 'claude-desktop' as ClientType,
          isInstalled: true,
          configPath: '/path/to/config',
        },
      ];

      const mockInstalledServers = {
        'installed-server': {
          command: 'npx',
          args: ['installed-server'],
          env: {},
        },
      };

      const mockServerRegistry = {
        getAllServers: jest.fn().mockResolvedValue(mockServers),
        getCategories: jest.fn().mockResolvedValue(['development']),
        getServersByCategory: jest.fn().mockResolvedValue(mockServers),
        getServerStats: jest.fn().mockResolvedValue({ total: 1 }),
      };

      const mockClientManager = {
        detectInstalledClients: jest.fn().mockResolvedValue(mockClients),
      };

      const mockConfigEngine = {
        listInstalledServers: jest.fn().mockResolvedValue(mockInstalledServers),
      };

      mockServerRegistry.mockImplementation(() => mockServerRegistry);
      mockClientManager.mockImplementation(() => mockClientManager);
      mockConfigEngine.mockImplementation(() => mockConfigEngine);

      await listCommand({});

      expect(mockSpinner.succeed).toHaveBeenCalledWith('Available MCP Servers:');
      expect(mockSpinner.succeed).toHaveBeenCalledWith('Installed MCP Servers:');
    });

    it('should handle multiple clients with different configurations', async () => {
      const mockClients = [
        {
          type: 'claude-desktop' as ClientType,
          isInstalled: true,
          configPath: '/path/to/claude',
        },
        {
          type: 'cursor' as ClientType,
          isInstalled: true,
          configPath: '/path/to/cursor',
        },
      ];

      const mockInstalledServers1 = {
        'server1': {
          command: 'npx',
          args: ['server1'],
        },
      };

      const mockInstalledServers2 = {
        'server2': {
          command: 'python',
          args: ['server2.py'],
        },
      };

      const mockClientManager = {
        detectInstalledClients: jest.fn().mockResolvedValue(mockClients),
      };

      const mockConfigEngine = {
        listInstalledServers: jest.fn()
          .mockResolvedValueOnce(mockInstalledServers1)
          .mockResolvedValueOnce(mockInstalledServers2),
      };

      mockClientManager.mockImplementation(() => mockClientManager);
      mockConfigEngine.mockImplementation(() => mockConfigEngine);
      mockGetClientDisplayName
        .mockReturnValueOnce('Claude Desktop')
        .mockReturnValueOnce('Cursor');

      await listCommand({ installed: true });

      expect(mockConfigEngine.listInstalledServers).toHaveBeenCalledWith('/path/to/claude');
      expect(mockConfigEngine.listInstalledServers).toHaveBeenCalledWith('/path/to/cursor');
      expect(mockConsoleLog).toHaveBeenCalledWith('\nTotal installed: 2 servers across 2 client(s)');
    });
  });
});