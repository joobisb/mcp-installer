import { execSync, spawn } from 'child_process';
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

    // Show installation summary
    if (installableCommands.length > 0) {
      console.log(
        chalk.cyan(
          `\n🔧 Installing ${installableCommands.length} missing ${installableCommands.length === 1 ? 'dependency' : 'dependencies'}:`
        )
      );
      installableCommands.forEach(({ command, installation }) => {
        const estimatedTime = this.getInstallationTimeEstimate(command, currentOS);
        console.log(
          chalk.gray(
            `   • ${command} (${installation.description}) ${estimatedTime ? `~${estimatedTime}` : ''}`
          )
        );
      });
      console.log('');
    }

    for (const { command, installation } of installableCommands) {
      const installCommands = installation[currentOS].installCommands;

      console.log(chalk.cyan(`\n📦 Installing ${command}...`));

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
          // Show the command being executed (but hide sensitive parts)
          const displayCommand =
            installCommand.length > 80 ? installCommand.substring(0, 77) + '...' : installCommand;
          console.log(chalk.gray(`   Running: ${displayCommand}`));

          // Use streaming execution
          const result = await this.executeCommandWithOutput(installCommand, spinner, command);

          if (result.success) {
            // Verify installation
            if (this.isCommandAvailable(command)) {
              spinner.succeed(chalk.green(`✅ Successfully installed ${command}`));
              installedCommands.push(command);
              break; // Move to next command
            } else {
              throw new Error('Command not available after installation');
            }
          } else {
            throw new Error(result.error || 'Installation failed');
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          spinner.fail(chalk.red(`❌ Failed to install ${command}`));

          // Show error details with better formatting
          console.log(chalk.red(`   Error: ${errorMessage}`));

          // Add troubleshooting suggestions based on command type
          const suggestions = this.getTroubleshootingSuggestions(command, currentOS);
          if (suggestions.length > 0) {
            console.log(chalk.yellow(`   💡 Suggestions:`));
            suggestions.forEach((suggestion) => {
              console.log(chalk.yellow(`      • ${suggestion}`));
            });
          }

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
   * Get estimated installation time for a command
   */
  private getInstallationTimeEstimate(command: string, os: string): string {
    const estimates: Record<string, Record<string, string>> = {
      npx: { mac: '30s', linux: '30s', windows: '45s' },
      node: { mac: '2-3min', linux: '1-2min', windows: '3-5min' },
      npm: { mac: '1min', linux: '1min', windows: '2min' },
      uvx: { mac: '1-2min', linux: '1-2min', windows: '2-3min' },
      uv: { mac: '1-2min', linux: '1-2min', windows: '2-3min' },
      pip: { mac: '30s', linux: '30s', windows: '1min' },
      docker: { mac: '5-10min', linux: '3-5min', windows: '5-10min' },
    };

    return estimates[command]?.[os] || '';
  }

  /**
   * Extract meaningful progress information from command output
   */
  private extractMeaningfulProgress(line: string): string | null {
    if (!line || line.length > 80) return null;

    // Common progress patterns
    const progressPatterns = [
      /downloading.*?(\d+(?:\.\d+)?(?:MB|KB|GB))/i,
      /installing.*?(\w+)/i,
      /fetching.*?(\w+)/i,
      /resolving.*?(\w+)/i,
      /building.*?(\w+)/i,
      /extracting.*?(\w+)/i,
      /(\d+%)/,
      /(successfully|complete|done|finished)/i,
    ];

    for (const pattern of progressPatterns) {
      const match = line.match(pattern);
      if (match) {
        // Return cleaned up version
        return line.length <= 50 ? line : match[0];
      }
    }

    // Filter out noise
    const noisePatterns = [/^\s*$/, /^[=\-+>]+$/, /warning:/i, /debug:/i, /verbose:/i];

    for (const pattern of noisePatterns) {
      if (pattern.test(line)) return null;
    }

    // Return line if it's reasonably short and meaningful
    return line.length <= 50 ? line : null;
  }

  /**
   * Get troubleshooting suggestions for failed installations
   */
  private getTroubleshootingSuggestions(command: string, os: string): string[] {
    const suggestions: Record<string, Record<string, string[]>> = {
      npx: {
        mac: ['Install Node.js from nodejs.org', 'Run: brew install node'],
        linux: [
          'Install Node.js: sudo apt install nodejs npm',
          'Or use: curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -',
        ],
        windows: ['Install Node.js from nodejs.org', 'Or use: winget install OpenJS.NodeJS'],
      },
      node: {
        mac: ['Run: brew install node', 'Download from nodejs.org'],
        linux: ['Run: sudo apt install nodejs', 'Or use NodeSource repository'],
        windows: ['Download from nodejs.org', 'Or use: winget install OpenJS.NodeJS'],
      },
      npm: {
        mac: ['Usually comes with Node.js - reinstall Node.js', 'Run: brew install node'],
        linux: ['Run: sudo apt install npm', 'Or reinstall Node.js'],
        windows: ['Usually comes with Node.js - reinstall Node.js'],
      },
      uvx: {
        mac: [
          'Install uv first: brew install uv',
          'Or: curl -LsSf https://astral.sh/uv/install.sh | sh',
        ],
        linux: [
          'Install uv: curl -LsSf https://astral.sh/uv/install.sh | sh',
          'Add ~/.local/bin to PATH',
        ],
        windows: ['Install uv: powershell -c "irm https://astral.sh/uv/install.ps1 | iex"'],
      },
      uv: {
        mac: ['Run: brew install uv', 'Or: curl -LsSf https://astral.sh/uv/install.sh | sh'],
        linux: ['Run: curl -LsSf https://astral.sh/uv/install.sh | sh', 'Add ~/.local/bin to PATH'],
        windows: ['Run: powershell -c "irm https://astral.sh/uv/install.ps1 | iex"'],
      },
      pip: {
        mac: ['Install Python 3: brew install python3', 'Python 3 includes pip'],
        linux: ['Install: sudo apt install python3-pip', 'Or: sudo yum install python3-pip'],
        windows: [
          'Install Python from python.org (includes pip)',
          'Or: winget install Python.Python.3',
        ],
      },
      docker: {
        mac: ['Install Docker Desktop from docker.com', 'Or: brew install --cask docker'],
        linux: [
          'Install: sudo apt install docker.io',
          'Add user to docker group: sudo usermod -aG docker $USER',
        ],
        windows: ['Install Docker Desktop from docker.com', 'Enable WSL2 if required'],
      },
    };

    return (
      suggestions[command]?.[os] || [
        'Check if the installer is available on your system',
        'Verify your internet connection',
        'Try running with administrator privileges',
      ]
    );
  }

  /**
   * Extract meaningful error information from command output
   */
  private extractMeaningfulError(fullError: string, commandName: string): string {
    if (!fullError) return `Failed to install ${commandName}`;

    // Common error patterns with suggestions
    const errorPatterns = [
      {
        pattern: /permission denied|access denied/i,
        message: 'Permission denied - try running with sudo or as administrator',
      },
      {
        pattern: /command not found|not recognized/i,
        message: 'Command not found - the installer may not be available on your system',
      },
      {
        pattern: /network|connection|timeout|unreachable/i,
        message: 'Network error - check your internet connection and try again',
      },
      {
        pattern: /disk|space|storage/i,
        message: 'Insufficient disk space - free up some space and try again',
      },
      {
        pattern: /already exists|already installed/i,
        message: 'Already installed but not detected - check your PATH environment',
      },
      {
        pattern: /certificate|ssl|tls/i,
        message: 'SSL/Certificate error - check your system time and certificates',
      },
    ];

    // Check for known error patterns
    for (const { pattern, message } of errorPatterns) {
      if (pattern.test(fullError)) {
        return message;
      }
    }

    // Extract first meaningful error line
    const lines = fullError
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line);
    for (const line of lines) {
      if (
        line.toLowerCase().includes('error') ||
        line.toLowerCase().includes('failed') ||
        line.toLowerCase().includes('cannot') ||
        line.toLowerCase().includes('unable')
      ) {
        return line.length > 120 ? line.substring(0, 117) + '...' : line;
      }
    }

    // Return first non-empty line if no specific error found
    const firstLine = lines[0];
    if (firstLine) {
      return firstLine.length > 120 ? firstLine.substring(0, 117) + '...' : firstLine;
    }

    return `Installation failed for ${commandName}`;
  }

  /**
   * Execute command with real-time output streaming
   */
  private async executeCommandWithOutput(
    command: string,
    spinner: any,
    commandName: string
  ): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      spinner.text = `Installing ${commandName}...`;

      // Use shell mode for complex commands (with pipes, redirects, etc)
      const child = spawn(command, {
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: true,
      });

      let outputBuffer = '';
      let errorBuffer = '';

      // Handle stdout
      child.stdout?.on('data', (data) => {
        const output = data.toString();
        outputBuffer += output;

        // Update spinner with last meaningful line
        const lines = output
          .trim()
          .split('\n')
          .filter((line: string) => line.trim());
        if (lines.length > 0) {
          const lastLine = lines[lines.length - 1].trim();
          const meaningfulUpdate = this.extractMeaningfulProgress(lastLine);
          if (meaningfulUpdate) {
            spinner.text = `Installing ${commandName}: ${meaningfulUpdate}`;
          }
        }
      });

      // Handle stderr
      child.stderr?.on('data', (data) => {
        const error = data.toString();
        errorBuffer += error;

        // Some installers output progress to stderr, so show it too
        const lines = error
          .trim()
          .split('\n')
          .filter((line: string) => line.trim());
        if (lines.length > 0) {
          const lastLine = lines[lines.length - 1].trim();
          // Only show stderr if it's not an error message
          if (
            !lastLine.toLowerCase().includes('error') &&
            !lastLine.toLowerCase().includes('failed')
          ) {
            const meaningfulUpdate = this.extractMeaningfulProgress(lastLine);
            if (meaningfulUpdate) {
              spinner.text = `Installing ${commandName}: ${meaningfulUpdate}`;
            }
          }
        }
      });

      // Handle process completion
      child.on('close', (code) => {
        if (code === 0) {
          resolve({ success: true });
        } else {
          // Try to extract meaningful error message
          const fullError =
            errorBuffer.trim() || outputBuffer.trim() || `Command failed with exit code: ${code}`;
          const meaningfulError = this.extractMeaningfulError(fullError, commandName);
          resolve({
            success: false,
            error: meaningfulError,
          });
        }
      });

      // Handle process errors
      child.on('error', (error) => {
        resolve({
          success: false,
          error: `Failed to start: ${error.message}`,
        });
      });
    });
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
