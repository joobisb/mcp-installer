import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { ClientManager, ConfigEngine } from '../core/index.js';
import { ClientType, getClientDisplayName, InstallationResult } from '@mcp-installer/shared';

interface UninstallOptions {
  clients: string;
  dryRun?: boolean;
  backup?: boolean;
}

export async function uninstallCommand(serverName: string, options: UninstallOptions): Promise<void> {
  const spinner = ora('Initializing uninstallation...').start();

  try {
    const clientManager = new ClientManager();
    const configEngine = new ConfigEngine();

    spinner.text = 'Detecting installed clients...';
    const allClients = await clientManager.detectInstalledClients();
    
    let targetClients: ClientType[];
    if (options.clients === 'all') {
      targetClients = allClients.filter(c => c.isInstalled).map(c => c.type);
      
      if (targetClients.length === 0) {
        spinner.fail(chalk.red('No supported AI clients detected'));
        return;
      }
    } else {
      const requestedClients = options.clients.split(',').map(c => c.trim()) as ClientType[];
      targetClients = [];
      
      for (const clientType of requestedClients) {
        if (!clientManager.isClientSupported(clientType)) {
          spinner.fail(chalk.red(`Unsupported client: ${clientType}`));
          console.log(chalk.yellow(`Supported clients: ${clientManager.getSupportedClients().join(', ')}`));
          return;
        }
        
        const clientInfo = allClients.find(c => c.type === clientType);
        if (!clientInfo?.isInstalled) {
          spinner.warn(chalk.yellow(`Client '${getClientDisplayName(clientType)}' not detected, skipping...`));
          continue;
        }
        
        targetClients.push(clientType);
      }
      
      if (targetClients.length === 0) {
        spinner.fail(chalk.red('None of the specified clients are installed'));
        return;
      }
    }

    spinner.text = 'Checking server installationss...';
    const installedClients: Array<{ client: ClientType; configPath: string }> = [];
    
    for (const clientType of targetClients) {
      const clientInfo = allClients.find(c => c.type === clientType)!;
      try {
        const installedServers = await configEngine.listInstalledServers(clientInfo.configPath);
        if (installedServers[serverName]) {
          installedClients.push({ client: clientType, configPath: clientInfo.configPath });
        }
      } catch (error) {
        spinner.warn(chalk.yellow(`Could not read config for ${getClientDisplayName(clientType)}`));
      }
    }

    if (installedClients.length === 0) {
      spinner.fail(chalk.red(`Server '${serverName}' is not installed on any of the specified clients`));
      return;
    }

    if (options.dryRun) {
      spinner.succeed(chalk.green('Dry run completed successfully'));
      console.log(chalk.cyan('\\nWould uninstall from:'));
      installedClients.forEach(({ client }) => {
        console.log(chalk.white(`  ${getClientDisplayName(client)}`));
      });
      return;
    }

    console.log(chalk.cyan(`\\nUninstalling ${serverName} from ${installedClients.length} client(s)...`));
    
    const { proceed } = await inquirer.prompt([{
      type: 'confirm',
      name: 'proceed',
      message: `Are you sure you want to uninstall '${serverName}'?`,
      default: false,
    }]);
    
    if (!proceed) {
      console.log(chalk.yellow('Uninstallation cancelled'));
      return;
    }

    const results: InstallationResult[] = [];
    
    for (const { client, configPath } of installedClients) {
      spinner.start(`Uninstalling from ${getClientDisplayName(client)}...`);
      
      try {
        await configEngine.uninstallServer(
          configPath,
          serverName,
          { backup: options.backup }
        );

        results.push({
          success: true,
          client,
          serverId: serverName,
          message: `Successfully uninstalled from ${getClientDisplayName(client)}`,
        });
        
        spinner.succeed(chalk.green(`Uninstalled from ${getClientDisplayName(client)}`));
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.push({
          success: false,
          client,
          serverId: serverName,
          message: `Failed to uninstall from ${getClientDisplayName(client)}`,
          error: errorMessage,
        });
        
        spinner.fail(chalk.red(`Failed to uninstall from ${getClientDisplayName(client)}: ${errorMessage}`));
      }
    }

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    console.log(chalk.cyan('\\nUninstallation Summary:'));
    console.log(chalk.green(`  ✓ Successful: ${successful}`));
    if (failed > 0) {
      console.log(chalk.red(`  ✗ Failed: ${failed}`));
    }
    
    if (successful > 0) {
      console.log(chalk.yellow('\\nNext steps:'));
      console.log(chalk.white('  1. Restart your AI client(s)'));
      console.log(chalk.white(`  2. The ${serverName} server should no longer be available`));
    }

  } catch (error) {
    spinner.fail(chalk.red('Uninstallation failed'));
    console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'));
    process.exit(1);
  }
}