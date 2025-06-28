import chalk from 'chalk';
import ora from 'ora';
import { join } from 'path';
import fsExtra from 'fs-extra';
const { ensureDir } = fsExtra;
import { ClientManager, ConfigEngine } from '../core/index.js';
import { ClientType, BackupInfo, getClientDisplayName, formatTimestamp } from '@mcp-installer/shared';

interface BackupOptions {
  clients: string;
  output?: string;
}

export async function backupCommand(options: BackupOptions): Promise<void> {
  const spinner = ora('Initializing backup...').start();

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

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = options.output || join(process.env.HOME || '~', '.mcp-installer', 'backups', timestamp);
    
    spinner.text = `Creating backup directory: ${backupDir}`;
    await ensureDir(backupDir);

    const backups: BackupInfo[] = [];
    const errors: string[] = [];

    console.log(chalk.cyan(`\nBacking up ${targetClients.length} client(s)...`));

    for (const clientType of targetClients) {
      const clientInfo = allClients.find(c => c.type === clientType)!;
      spinner.start(`Backing up ${getClientDisplayName(clientType)}...`);
      
      try {
        const backupInfo = await configEngine.createBackup(clientInfo.configPath);
        backups.push(backupInfo);
        
        spinner.succeed(chalk.green(`Backed up ${getClientDisplayName(clientType)}`));
        console.log(chalk.dim(`  ${backupInfo.backupPath}`));
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`${getClientDisplayName(clientType)}: ${errorMessage}`);
        spinner.fail(chalk.red(`Failed to backup ${getClientDisplayName(clientType)}: ${errorMessage}`));
      }
    }

    spinner.succeed(chalk.green('Backup process completed'));

    console.log(chalk.cyan('\nBackup Summary:'));
    console.log(chalk.green(`  ✓ Successful: ${backups.length}`));
    if (errors.length > 0) {
      console.log(chalk.red(`  ✗ Failed: ${errors.length}`));
      console.log(chalk.red('\nErrors:'));
      errors.forEach((error: unknown) => console.log(chalk.red(`  • ${error}`)));
    }

    if (backups.length > 0) {
      console.log(chalk.cyan('\nBackup Details:'));
      backups.forEach(backup => {
        console.log(`  ${getClientDisplayName(backup.client)}: ${chalk.dim(backup.backupPath)}`);
        console.log(`    Created: ${formatTimestamp(backup.timestamp)}`);
      });

      console.log(chalk.yellow('\nTo restore a backup:'));
      console.log(chalk.white(`  mcp-installer restore <backup-path>`));
    }

  } catch (error: unknown) {
    spinner.fail(chalk.red('Backup failed'));
    console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'));
    process.exit(1);
  }
}