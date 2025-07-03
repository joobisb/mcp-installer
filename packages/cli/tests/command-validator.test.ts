import { CommandValidator } from '../src/core/command-validator';
import { MCPServer } from '@mcp-installer/shared';
import { execSync } from 'child_process';
import os from 'os';

// Mock dependencies
jest.mock('child_process');
jest.mock('os', () => ({
  platform: jest.fn(),
  arch: jest.fn(),
}));
jest.mock('inquirer');
jest.mock('ora');

const mockExecSync = execSync as jest.MockedFunction<typeof execSync>;
const mockPlatform = os.platform as jest.MockedFunction<typeof os.platform>;
const mockArch = os.arch as jest.MockedFunction<typeof os.arch>;

describe('CommandValidator', () => {
  let commandValidator: CommandValidator;

  beforeEach(() => {
    commandValidator = new CommandValidator();
    jest.clearAllMocks();
  });

  describe('isCommandAvailable', () => {
    it('should return true when command exists on Unix systems', () => {
      mockPlatform.mockReturnValue('darwin');
      mockExecSync.mockReturnValue(Buffer.from('/usr/bin/node'));

      const result = commandValidator.isCommandAvailable('node');

      expect(result).toBe(true);
      expect(mockExecSync).toHaveBeenCalledWith('which node', { stdio: 'ignore' });
    });

    it('should return true when command exists on Windows', () => {
      mockPlatform.mockReturnValue('win32');
      mockExecSync.mockReturnValue(Buffer.from('C:\\Program Files\\nodejs\\node.exe'));

      const result = commandValidator.isCommandAvailable('node');

      expect(result).toBe(true);
      expect(mockExecSync).toHaveBeenCalledWith('where node', { stdio: 'ignore' });
    });

    it('should return false when command does not exist', () => {
      mockPlatform.mockReturnValue('darwin');
      mockExecSync.mockImplementation(() => {
        throw new Error('Command not found');
      });

      const result = commandValidator.isCommandAvailable('nonexistent');

      expect(result).toBe(false);
      expect(mockExecSync).toHaveBeenCalledWith('which nonexistent', { stdio: 'ignore' });
    });

    it('should use "where" command on Windows', () => {
      mockPlatform.mockReturnValue('win32');
      mockExecSync.mockImplementation(() => {
        throw new Error('Command not found');
      });

      commandValidator.isCommandAvailable('uvx');

      expect(mockExecSync).toHaveBeenCalledWith('where uvx', { stdio: 'ignore' });
    });

    it('should use "which" command on non-Windows platforms', () => {
      mockPlatform.mockReturnValue('linux');
      mockExecSync.mockImplementation(() => {
        throw new Error('Command not found');
      });

      commandValidator.isCommandAvailable('uvx');

      expect(mockExecSync).toHaveBeenCalledWith('which uvx', { stdio: 'ignore' });
    });
  });

  describe('getCurrentOS', () => {
    it('should return "mac" for darwin platform', () => {
      mockPlatform.mockReturnValue('darwin');

      const result = commandValidator.getCurrentOS();

      expect(result).toBe('mac');
    });

    it('should return "windows" for win32 platform', () => {
      mockPlatform.mockReturnValue('win32');

      const result = commandValidator.getCurrentOS();

      expect(result).toBe('windows');
    });

    it('should return "linux" for linux platform', () => {
      mockPlatform.mockReturnValue('linux');

      const result = commandValidator.getCurrentOS();

      expect(result).toBe('linux');
    });

    it('should return "linux" for unknown platforms', () => {
      mockPlatform.mockReturnValue('freebsd' as any);

      const result = commandValidator.getCurrentOS();

      expect(result).toBe('linux');
    });
  });

  describe('validateServerCommands', () => {
    const mockServer: MCPServer = {
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

    it('should return valid when command is available', () => {
      mockPlatform.mockReturnValue('darwin');
      mockExecSync.mockReturnValue(Buffer.from('/usr/bin/npx'));

      const result = commandValidator.validateServerCommands(mockServer);

      expect(result.isValid).toBe(true);
      expect(result.missingCommands).toHaveLength(0);
    });

    it('should return invalid when command is missing', () => {
      mockPlatform.mockReturnValue('darwin');
      mockExecSync.mockImplementation(() => {
        throw new Error('Command not found');
      });

      const result = commandValidator.validateServerCommands(mockServer);

      expect(result.isValid).toBe(false);
      expect(result.missingCommands).toHaveLength(1);
      expect(result.missingCommands[0].command).toBe('npx');
      expect(result.missingCommands[0].installation.name).toBe('Node.js & npm');
    });

    it('should handle unknown commands gracefully', () => {
      const serverWithUnknownCommand: MCPServer = {
        ...mockServer,
        installation: {
          command: 'unknown-command',
          args: ['test'],
        },
      };

      mockPlatform.mockReturnValue('darwin');
      mockExecSync.mockImplementation(() => {
        throw new Error('Command not found');
      });

      const result = commandValidator.validateServerCommands(serverWithUnknownCommand);

      expect(result.isValid).toBe(true); // Should be valid since we don't have installation info for unknown commands
      expect(result.missingCommands).toHaveLength(0);
    });
  });

  describe('getInstallationInstructions', () => {
    const mockMissingCommands = [
      {
        command: 'uvx',
        installation: {
          name: 'uv (Python package manager)',
          description: 'Modern Python package and project manager',
          mac: {
            instructions: [
              'Install via Homebrew: brew install uv',
              'Or via curl: curl -LsSf https://astral.sh/uv/install.sh | sh',
            ],
            allowInstall: true,
            installCommands: ['brew install uv'],
          },
          linux: {
            instructions: [
              'Install via curl: curl -LsSf https://astral.sh/uv/install.sh | sh',
              'Or via pip: pip install uv',
            ],
            allowInstall: true,
            installCommands: ['curl -LsSf https://astral.sh/uv/install.sh | sh'],
          },
          windows: {
            instructions: [
              'Install via PowerShell: powershell -c "irm https://astral.sh/uv/install.ps1 | iex"',
              'Or via Scoop: scoop install uv',
            ],
            allowInstall: true,
            installCommands: [
              'powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"',
            ],
          },
        },
      },
    ];

    it('should return Mac-specific instructions', () => {
      mockPlatform.mockReturnValue('darwin');

      const instructions = commandValidator.getInstallationInstructions(mockMissingCommands);

      expect(instructions).toContain('\n📦 Missing command: uvx');
      expect(instructions).toContain('   Modern Python package and project manager');
      expect(instructions).toContain('   Install via Homebrew: brew install uv');
      expect(instructions).toContain(
        '   Or via curl: curl -LsSf https://astral.sh/uv/install.sh | sh'
      );
    });

    it('should return Linux-specific instructions', () => {
      mockPlatform.mockReturnValue('linux');

      const instructions = commandValidator.getInstallationInstructions(mockMissingCommands);

      expect(instructions).toContain('\n📦 Missing command: uvx');
      expect(instructions).toContain(
        '   Install via curl: curl -LsSf https://astral.sh/uv/install.sh | sh'
      );
      expect(instructions).toContain('   Or via pip: pip install uv');
    });

    it('should return Windows-specific instructions', () => {
      mockPlatform.mockReturnValue('win32');

      const instructions = commandValidator.getInstallationInstructions(mockMissingCommands);

      expect(instructions).toContain('\n📦 Missing command: uvx');
      expect(instructions).toContain(
        '   Install via PowerShell: powershell -c "irm https://astral.sh/uv/install.ps1 | iex"'
      );
      expect(instructions).toContain('   Or via Scoop: scoop install uv');
    });

    it('should handle multiple missing commands', () => {
      const multipleMissingCommands = [
        ...mockMissingCommands,
        {
          command: 'docker',
          installation: {
            name: 'Docker',
            description: 'Container platform',
            mac: {
              instructions: ['Install Docker Desktop from https://docker.com/'],
              allowInstall: false,
              installCommands: [],
            },
            linux: {
              instructions: ['Install Docker Engine: sudo apt install docker.io'],
              allowInstall: false,
              installCommands: [],
            },
            windows: {
              instructions: ['Install Docker Desktop from https://docker.com/'],
              allowInstall: false,
              installCommands: [],
            },
          },
        },
      ];

      mockPlatform.mockReturnValue('darwin');

      const instructions = commandValidator.getInstallationInstructions(multipleMissingCommands);

      expect(instructions.filter((line) => line.includes('📦 Missing command:'))).toHaveLength(2);
      expect(instructions).toContain('\n📦 Missing command: uvx');
      expect(instructions).toContain('\n📦 Missing command: docker');
    });
  });

  describe('getSystemInfo', () => {
    it('should return system information', () => {
      mockPlatform.mockReturnValue('darwin');
      mockArch.mockReturnValue('x64');

      const systemInfo = commandValidator.getSystemInfo();

      expect(systemInfo.os).toBe('mac');
      expect(systemInfo.platform).toBe('darwin');
      expect(systemInfo.arch).toBe('x64');
    });
  });

  describe('command installation configurations', () => {
    it('should have installation info for common commands', () => {
      const commands = ['npx', 'uvx', 'uv', 'docker', 'pip', 'node'];

      commands.forEach((command) => {
        mockPlatform.mockReturnValue('darwin');
        mockExecSync.mockImplementation(() => {
          throw new Error('Command not found');
        });

        const mockServer: MCPServer = {
          id: 'test',
          name: 'Test',
          description: 'Test',
          category: 'utility',
          type: 'stdio',
          difficulty: 'simple',
          requiresAuth: false,
          installation: { command, args: [] },
          documentation: 'https://example.com',
        };

        const result = commandValidator.validateServerCommands(mockServer);

        if (command !== 'unknown-command') {
          expect(result.missingCommands).toHaveLength(1);
          expect(result.missingCommands[0].installation.name).toBeDefined();
          expect(result.missingCommands[0].installation.mac.instructions).toBeDefined();
          expect(result.missingCommands[0].installation.linux.instructions).toBeDefined();
          expect(result.missingCommands[0].installation.windows.instructions).toBeDefined();
          expect(result.missingCommands[0].installation.mac.allowInstall).toBeDefined();
          expect(result.missingCommands[0].installation.linux.allowInstall).toBeDefined();
          expect(result.missingCommands[0].installation.windows.allowInstall).toBeDefined();
          expect(result.missingCommands[0].installation.mac.installCommands).toBeDefined();
          expect(result.missingCommands[0].installation.linux.installCommands).toBeDefined();
          expect(result.missingCommands[0].installation.windows.installCommands).toBeDefined();
        }
      });
    });
  });

  describe('promptAndInstallMissingCommands', () => {
    it('should have the method defined', () => {
      expect(typeof commandValidator.promptAndInstallMissingCommands).toBe('function');
    });

    // TODO: Add comprehensive tests for promptAndInstallMissingCommands method
    // These tests require complex mocking of ora, inquirer, and execSync
    // For now, we verify the method exists and integration tests will validate the functionality
  });
});
