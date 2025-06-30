import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { ClientManager, ConfigEngine, ParameterHandler, ServerRegistry } from '../core/index.js';
import { ClientType, getClientDisplayName, InstallationResult } from '@mcp-installer/shared';

interface InstallOptions {
  clients: string;
  dryRun?: boolean;
  backup?: boolean;
  force?: boolean;
}

export async function installCommand(serverName: string, options: InstallOptions): Promise<void> {
  const spinner = ora('Initializing installation...').start();

  try {
    const serverRegistry = new ServerRegistry();
    const clientManager = new ClientManager();
    const configEngine = new ConfigEngine();
    const parameterHandler = new ParameterHandler();

    spinner.text = 'Loading server registry...';
    const server = await serverRegistry.getServer(serverName);

    if (!server) {
      spinner.fail(chalk.red(`Server '${serverName}' not found in registry`));
      console.log(chalk.yellow('\nAvailable servers:'));
      const allServers = await serverRegistry.getAllServers();
      allServers.forEach((s) => {
        console.log(chalk.cyan(`  ${s.id}`), '-', s.description);
      });
      return;
    }

    spinner.text = 'Detecting installed clients...';
    const allClients = await clientManager.detectInstalledClients();

    let targetClients: ClientType[];
    if (options.clients === 'all') {
      targetClients = allClients.filter((c) => c.isInstalled).map((c) => c.type);

      if (targetClients.length === 0) {
        spinner.fail(chalk.red('No supported AI clients detected'));
        console.log(chalk.yellow('\nSupported clients: Claude Desktop, Cursor, Gemini'));
        console.log(chalk.yellow('Please install at least one client and try again.'));
        return;
      }
    } else {
      const requestedClients = options.clients.split(',').map((c) => c.trim());
      targetClients = [];

      // Map client aliases to actual client types
      const clientAliases: Record<string, ClientType> = {
        claude: 'claude-code',
        'claude-desktop': 'claude-desktop',
        cursor: 'cursor',
        gemini: 'gemini',
        vscode: 'vscode',
        windsurf: 'windsurf',
        'qodo-gen': 'qodo-gen',
      };

      for (const requestedClient of requestedClients) {
        const clientType = clientAliases[requestedClient] || (requestedClient as ClientType);

        if (!clientManager.isClientSupported(clientType)) {
          spinner.fail(chalk.red(`Unsupported client: ${requestedClient}`));
          console.log(
            chalk.yellow(
              `Supported clients: claude, claude-desktop, cursor, gemini, vscode, windsurf, qodo-gen`
            )
          );
          return;
        }

        const clientInfo = allClients.find((c) => c.type === clientType);
        if (!clientInfo?.isInstalled) {
          spinner.warn(
            chalk.yellow(`Client '${getClientDisplayName(clientType)}' not detected, skipping...`)
          );
          continue;
        }

        targetClients.push(clientType);
      }

      if (targetClients.length === 0) {
        spinner.fail(chalk.red('None of the specified clients are installed'));
        return;
      }
    }

    spinner.text = 'Validating server configuration...';
    const validation = await serverRegistry.validateServer(serverName);

    if (!validation.isValid) {
      spinner.fail(chalk.red('Server validation failed'));
      validation.errors.forEach((error: string) => console.log(chalk.red(`  ✗ ${error}`)));
      return;
    }

    if (validation.warnings.length > 0) {
      spinner.warn(chalk.yellow('Server validation warnings:'));
      validation.warnings.forEach((warning: string) =>
        console.log(chalk.yellow(`  ⚠ ${warning}`))
      );
    }

    // Handle parameter prompting
    spinner.stop();
    let parameterValues = {};
    if (parameterHandler.hasParameters(server)) {
      parameterValues = await parameterHandler.promptForParameters(server);

      // Show preview of final command
      const previewCommand = parameterHandler.previewCommand(server, parameterValues);
      console.log(chalk.cyan('\n📋 Configuration preview:'));
      console.log(chalk.gray(`  ${previewCommand}`));

      const { confirm } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: 'Proceed with this configuration?',
          default: true,
        },
      ]);

      if (!confirm) {
        console.log(chalk.yellow('Installation cancelled'));
        return;
      }
    }

    if (options.dryRun) {
      const { args, env } = parameterHandler.substituteParameters(server, parameterValues);
      spinner.succeed(chalk.green('Dry run completed successfully'));
      console.log(chalk.cyan('\\nWould install:'));
      console.log(chalk.white(`  Server: ${server.name} (${server.id})`));
      console.log(chalk.white(`  Clients: ${targetClients.map(getClientDisplayName).join(', ')}`));
      console.log(chalk.white(`  Command: ${server.installation.command} ${args.join(' ')}`));
      if (env && Object.keys(env).length > 0) {
        console.log(
          chalk.white(
            `  Environment: ${Object.entries(env)
              .map(([k, v]) => `${k}=${v}`)
              .join(', ')}`
          )
        );
      }
      return;
    }

    console.log(chalk.cyan(`\\nInstalling ${server.name} to ${targetClients.length} client(s)...`));

    if (server.requiresAuth && server.installation.env) {
      console.log(
        chalk.yellow(
          '\\nThis server requires authentication. Please ensure environment variables are set:'
        )
      );
      Object.keys(server.installation.env).forEach((envVar) => {
        console.log(chalk.yellow(`  ${envVar}`));
      });

      const { proceed } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'proceed',
          message: 'Continue with installation?',
          default: true,
        },
      ]);

      if (!proceed) {
        console.log(chalk.yellow('Installation cancelled'));
        return;
      }
    }

    const results: InstallationResult[] = [];

    for (const clientType of targetClients) {
      const clientInfo = allClients.find((c) => c.type === clientType)!;
      spinner.start(`Installing to ${getClientDisplayName(clientType)}...`);

      try {
        const { args, env } = parameterHandler.substituteParameters(server, parameterValues);
        const mcpConfig = {
          command: server.installation.command,
          args: args,
          env: env,
        };

        await configEngine.installServer(clientInfo.configPath, server.id, mcpConfig, {
          backup: options.backup,
          force: options.force,
        });

        results.push({
          success: true,
          client: clientType,
          serverId: server.id,
          message: `Successfully installed to ${getClientDisplayName(clientType)}`,
        });

        spinner.succeed(chalk.green(`Installed to ${getClientDisplayName(clientType)}`));
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.push({
          success: false,
          client: clientType,
          serverId: server.id,
          message: `Failed to install to ${getClientDisplayName(clientType)}`,
          error: errorMessage,
        });

        spinner.fail(
          chalk.red(`Failed to install to ${getClientDisplayName(clientType)}: ${errorMessage}`)
        );
      }
    }

    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    console.log(chalk.cyan('\\nInstallation Summary:'));
    console.log(chalk.green(`  ✓ Successful: ${successful}`));
    if (failed > 0) {
      console.log(chalk.red(`  ✗ Failed: ${failed}`));
    }

    if (successful > 0) {
      console.log(chalk.yellow('\\nNext steps:'));
      console.log(chalk.white('  1. Restart your AI client(s)'));
      console.log(chalk.white(`  2. The ${server.name} server should now be available`));
      if (server.documentation) {
        console.log(chalk.white(`  3. Documentation: ${server.documentation}`));
      }
    }
  } catch (error) {
    spinner.fail(chalk.red('Installation failed'));
    console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'));
    process.exit(1);
  }
}
