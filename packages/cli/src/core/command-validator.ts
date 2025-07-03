import { execSync } from 'child_process';
import os from 'os';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import { MCPServer } from '@mcp-installer/shared';

interface CommandInstallation {
  name: string;
  description: string;
  mac: {
    instructions: string[];
    allowInstall: boolean;
    installCommands: string[];
  };
  linux: {
    instructions: string[];
    allowInstall: boolean;
    installCommands: string[];
  };
  windows: {
    instructions: string[];
    allowInstall: boolean;
    installCommands: string[];
  };
}

export class CommandValidator {
  private static readonly COMMAND_INSTALLATIONS: Record<string, CommandInstallation> = {
    npx: {
      name: 'Node.js & npm',
      description: 'JavaScript runtime and package manager',
      mac: {
        instructions: [
          'Install Node.js from https://nodejs.org/',
          'Or via Homebrew: brew install node',
        ],
        allowInstall: true,
        installCommands: ['brew install node'],
      },
      linux: {
        instructions: [
          'Install Node.js via package manager:',
          '  Ubuntu/Debian: sudo apt install nodejs npm',
          '  CentOS/RHEL: sudo yum install nodejs npm',
          '  Or from https://nodejs.org/',
        ],
        allowInstall: true,
        installCommands: ['sudo apt install -y nodejs npm || sudo yum install -y nodejs npm'],
      },
      windows: {
        instructions: [
          'Install Node.js from https://nodejs.org/',
          'Or via Chocolatey: choco install nodejs',
          'Or via Winget: winget install OpenJS.NodeJS',
        ],
        allowInstall: true,
        installCommands: ['winget install OpenJS.NodeJS'],
      },
    },
    uvx: {
      name: 'uv (Python package manager)',
      description: 'Modern Python package and project manager',
      mac: {
        instructions: ['Install via curl: curl -LsSf https://astral.sh/uv/install.sh | sh'],
        allowInstall: true,
        installCommands: ['curl -LsSf https://astral.sh/uv/install.sh | sh'],
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
          'Install via PowerShell: powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"',
          'Or via Scoop: scoop install uv',
          'Or via pip: pip install uv',
        ],
        allowInstall: true,
        installCommands: [
          'powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"',
        ],
      },
    },
    uv: {
      name: 'uv (Python package manager)',
      description: 'Modern Python package and project manager',
      mac: {
        instructions: [
          'Install via Homebrew: brew install uv',
          'Or via curl: curl -LsSf https://astral.sh/uv/install.sh | sh',
        ],
        allowInstall: true,
        installCommands: ['curl -LsSf https://astral.sh/uv/install.sh | sh'],
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
          'Install via PowerShell: powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"',
          'Or via Scoop: scoop install uv',
          'Or via pip: pip install uv',
        ],
        allowInstall: true,
        installCommands: [
          'powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"',
        ],
      },
    },
    docker: {
      name: 'Docker',
      description: 'Container platform',
      mac: {
        instructions: [
          'Install Docker Desktop from https://docker.com/products/docker-desktop/',
          'Or via Homebrew: brew install --cask docker',
        ],
        allowInstall: false,
        installCommands: [],
      },
      linux: {
        instructions: [
          'Install Docker Engine:',
          '  Ubuntu: sudo apt install docker.io',
          '  CentOS: sudo yum install docker',
          'Start Docker service: sudo systemctl start docker',
          'Add user to docker group: sudo usermod -aG docker $USER',
        ],
        allowInstall: false,
        installCommands: [],
      },
      windows: {
        instructions: [
          'Install Docker Desktop from https://docker.com/products/docker-desktop/',
          'Or via Chocolatey: choco install docker-desktop',
          'Or via Winget: winget install Docker.DockerDesktop',
        ],
        allowInstall: false,
        installCommands: [],
      },
    },
    pip: {
      name: 'Python & pip',
      description: 'Python runtime and package installer',
      mac: {
        instructions: [
          'Install Python from https://python.org/',
          'Or via Homebrew: brew install python',
          'pip is included with Python 3.4+',
        ],
        allowInstall: true,
        installCommands: ['brew install python'],
      },
      linux: {
        instructions: [
          'Install Python via package manager:',
          '  Ubuntu/Debian: sudo apt-get install python3 python3-pip',
          '  CentOS/RHEL: sudo yum install python3 python3-pip',
        ],
        allowInstall: true,
        installCommands: [
          'sudo apt-get install -y python3 python3-pip || sudo yum install -y python3 python3-pip',
        ],
      },
      windows: {
        instructions: [
          'Install Python from https://python.org/',
          'Or via Microsoft Store: search for "Python"',
          'Or via Chocolatey: choco install python',
          'pip is included with Python 3.4+',
        ],
        allowInstall: true,
        installCommands: ['winget install Python.Python.3.12'],
      },
    },
    node: {
      name: 'Node.js',
      description: 'JavaScript runtime',
      mac: {
        instructions: [
          'Install Node.js from https://nodejs.org/',
          'Or via Homebrew: brew install node',
        ],
        allowInstall: true,
        installCommands: ['brew install node'],
      },
      linux: {
        instructions: [
          'Install Node.js via package manager:',
          '  Ubuntu/Debian: sudo apt install nodejs',
          '  CentOS/RHEL: sudo yum install nodejs',
          '  Or from https://nodejs.org/',
        ],
        allowInstall: true,
        installCommands: ['sudo apt install -y nodejs || sudo yum install -y nodejs'],
      },
      windows: {
        instructions: [
          'Install Node.js from https://nodejs.org/',
          'Or via Chocolatey: choco install nodejs',
          'Or via Winget: winget install OpenJS.NodeJS',
        ],
        allowInstall: true,
        installCommands: ['winget install OpenJS.NodeJS'],
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

      installation[currentOS].instructions.forEach((instruction) => {
        instructions.push(`   ${instruction}`);
      });
    });

    return instructions;
  }

  /**
   * Prompt user and install missing commands
   */
  public async promptAndInstallMissingCommands(
    missingCommands: Array<{ command: string; installation: CommandInstallation }>,
    parentSpinner?: any
  ): Promise<{
    success: boolean;
    installedCommands: string[];
    failedCommands: Array<{ command: string; error: string }>;
    userDeclined: boolean;
  }> {
    const currentOS = this.getCurrentOS();
    const installableCommands = missingCommands.filter(
      ({ installation }) => installation[currentOS].allowInstall
    );

    if (installableCommands.length === 0) {
      return {
        success: true,
        installedCommands: [],
        failedCommands: [],
        userDeclined: false,
      };
    }

    // Prompt user for permission
    const commandList = installableCommands
      .map(({ command, installation }) => `  • ${command} (${installation.description})`)
      .join('\n');

    console.log(chalk.yellow('\n🔧 Missing dependencies detected:'));
    console.log(commandList);
    console.log(''); // Add blank line for better spacing

    const { shouldInstall } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'shouldInstall',
        message: 'Would you like to automatically install these dependencies?',
        default: false, // Changed to false to make it explicit
      },
    ]);

    if (!shouldInstall) {
      return {
        success: false,
        installedCommands: [],
        failedCommands: [],
        userDeclined: true,
      };
    }

    // Install each command
    const installedCommands: string[] = [];
    const failedCommands: Array<{ command: string; error: string }> = [];

    for (const { command, installation } of installableCommands) {
      const installCommands = installation[currentOS].installCommands;

      for (const installCommand of installCommands) {
        // Use parent spinner if available, otherwise create new one
        const spinner = parentSpinner || ora(`Installing ${command}...`);

        if (parentSpinner) {
          parentSpinner.text = `Installing ${command}...`;
          parentSpinner.start();
        } else {
          spinner.start();
        }

        try {
          execSync(installCommand, { stdio: 'pipe' });

          // Verify installation
          if (this.isCommandAvailable(command)) {
            spinner.succeed(chalk.green(`Successfully installed ${command}`));
            installedCommands.push(command);
            break; // Move to next command
          } else {
            throw new Error('Command not available after installation');
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          spinner.fail(chalk.red(`Failed to install ${command}: ${errorMessage}`));

          // Only add to failed commands after all install commands for this command have been tried
          if (installCommand === installCommands[installCommands.length - 1]) {
            failedCommands.push({ command, error: errorMessage });
          }
        }
      }
    }

    const allSuccessful = failedCommands.length === 0;

    if (allSuccessful && installedCommands.length > 0) {
      console.log(chalk.green('\n✅ All dependencies installed successfully!'));
    } else if (installedCommands.length > 0) {
      console.log(chalk.yellow('\n⚠️  Some dependencies were installed, but others failed.'));
    }

    return {
      success: allSuccessful,
      installedCommands,
      failedCommands,
      userDeclined: false,
    };
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
