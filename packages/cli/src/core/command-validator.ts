import { execSync } from 'child_process';
import os from 'os';
import { MCPServer } from '@mcp-installer/shared';

interface CommandInstallation {
  name: string;
  description: string;
  instructions: {
    mac: string[];
    linux: string[];
    windows: string[];
  };
}

export class CommandValidator {
  private static readonly COMMAND_INSTALLATIONS: Record<string, CommandInstallation> = {
    npx: {
      name: 'Node.js & npm',
      description: 'JavaScript runtime and package manager',
      instructions: {
        mac: ['Install Node.js from https://nodejs.org/', 'Or via Homebrew: brew install node'],
        linux: [
          'Install Node.js via package manager:',
          '  Ubuntu/Debian: sudo apt install nodejs npm',
          '  CentOS/RHEL: sudo yum install nodejs npm',
          '  Or from https://nodejs.org/',
        ],
        windows: [
          'Install Node.js from https://nodejs.org/',
          'Or via Chocolatey: choco install nodejs',
          'Or via Winget: winget install OpenJS.NodeJS',
        ],
      },
    },
    uvx: {
      name: 'uv (Python package manager)',
      description: 'Modern Python package and project manager',
      instructions: {
        mac: [
          'Install via Homebrew: brew install uv',
          'Or via curl: curl -LsSf https://astral.sh/uv/install.sh | sh',
        ],
        linux: [
          'Install via curl: curl -LsSf https://astral.sh/uv/install.sh | sh',
          'Or via pip: pip install uv',
        ],
        windows: [
          'Install via PowerShell: powershell -c "irm https://astral.sh/uv/install.ps1 | iex"',
          'Or via Scoop: scoop install uv',
          'Or via pip: pip install uv',
        ],
      },
    },
    uv: {
      name: 'uv (Python package manager)',
      description: 'Modern Python package and project manager',
      instructions: {
        mac: [
          'Install via Homebrew: brew install uv',
          'Or via curl: curl -LsSf https://astral.sh/uv/install.sh | sh',
        ],
        linux: [
          'Install via curl: curl -LsSf https://astral.sh/uv/install.sh | sh',
          'Or via pip: pip install uv',
        ],
        windows: [
          'Install via PowerShell: powershell -c "irm https://astral.sh/uv/install.ps1 | iex"',
          'Or via Scoop: scoop install uv',
          'Or via pip: pip install uv',
        ],
      },
    },
    docker: {
      name: 'Docker',
      description: 'Container platform',
      instructions: {
        mac: [
          'Install Docker Desktop from https://docker.com/products/docker-desktop/',
          'Or via Homebrew: brew install --cask docker',
        ],
        linux: [
          'Install Docker Engine:',
          '  Ubuntu: sudo apt install docker.io',
          '  CentOS: sudo yum install docker',
          'Start Docker service: sudo systemctl start docker',
          'Add user to docker group: sudo usermod -aG docker $USER',
        ],
        windows: [
          'Install Docker Desktop from https://docker.com/products/docker-desktop/',
          'Or via Chocolatey: choco install docker-desktop',
          'Or via Winget: winget install Docker.DockerDesktop',
        ],
      },
    },
    pip: {
      name: 'Python & pip',
      description: 'Python runtime and package installer',
      instructions: {
        mac: [
          'Install Python from https://python.org/',
          'Or via Homebrew: brew install python',
          'pip is included with Python 3.4+',
        ],
        linux: [
          'Install Python via package manager:',
          '  Ubuntu/Debian: sudo apt install python3 python3-pip',
          '  CentOS/RHEL: sudo yum install python3 python3-pip',
        ],
        windows: [
          'Install Python from https://python.org/',
          'Or via Microsoft Store: search for "Python"',
          'Or via Chocolatey: choco install python',
          'pip is included with Python 3.4+',
        ],
      },
    },
    node: {
      name: 'Node.js',
      description: 'JavaScript runtime',
      instructions: {
        mac: ['Install Node.js from https://nodejs.org/', 'Or via Homebrew: brew install node'],
        linux: [
          'Install Node.js via package manager:',
          '  Ubuntu/Debian: sudo apt install nodejs',
          '  CentOS/RHEL: sudo yum install nodejs',
          '  Or from https://nodejs.org/',
        ],
        windows: [
          'Install Node.js from https://nodejs.org/',
          'Or via Chocolatey: choco install nodejs',
          'Or via Winget: winget install OpenJS.NodeJS',
        ],
      },
    },
  };

  /**
   * Check if a command is available on the system
   */
  public isCommandAvailable(command: string): boolean {
    try {
      if (os.platform() === 'win32') {
        execSync(`where ${command}`, { stdio: 'ignore' });
      } else {
        execSync(`which ${command}`, { stdio: 'ignore' });
      }
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get the current operating system
   */
  public getCurrentOS(): 'mac' | 'linux' | 'windows' {
    const platform = os.platform();
    switch (platform) {
      case 'darwin':
        return 'mac';
      case 'win32':
        return 'windows';
      default:
        return 'linux';
    }
  }

  /**
   * Validate all commands required by a server
   */
  public validateServerCommands(server: MCPServer): {
    isValid: boolean;
    missingCommands: Array<{
      command: string;
      installation: CommandInstallation;
    }>;
  } {
    const requiredCommand = server.installation.command;
    const missingCommands: Array<{ command: string; installation: CommandInstallation }> = [];

    if (!this.isCommandAvailable(requiredCommand)) {
      const installation = CommandValidator.COMMAND_INSTALLATIONS[requiredCommand];
      if (installation) {
        missingCommands.push({
          command: requiredCommand,
          installation,
        });
      }
    }

    return {
      isValid: missingCommands.length === 0,
      missingCommands,
    };
  }

  /**
   * Get installation instructions for missing commands
   */
  public getInstallationInstructions(
    missingCommands: Array<{ command: string; installation: CommandInstallation }>
  ): string[] {
    const currentOS = this.getCurrentOS();
    const instructions: string[] = [];

    missingCommands.forEach(({ command, installation }) => {
      instructions.push(`\n📦 Missing command: ${command}`);
      instructions.push(`   ${installation.description}`);
      instructions.push('   Installation options:');

      installation.instructions[currentOS].forEach((instruction) => {
        instructions.push(`   ${instruction}`);
      });
    });

    return instructions;
  }

  /**
   * Get a summary of OS information for debugging
   */
  public getSystemInfo(): { os: string; platform: string; arch: string } {
    return {
      os: this.getCurrentOS(),
      platform: os.platform(),
      arch: os.arch(),
    };
  }
}
