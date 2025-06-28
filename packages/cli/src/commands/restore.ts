import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { existsSync } from 'fs';
import { ConfigEngine } from '../core/index.js';

interface RestoreOptions {
  client?: string;
  force?: boolean;
}

export async function restoreCommand(backupPath: string, options: RestoreOptions): Promise<void> {
  const spinner = ora('Initializing restore...').start();

  try {
    const configEngine = new ConfigEngine();

    spinner.text = 'Validating backup path...';
    if (!existsSync(backupPath)) {
      spinner.fail(chalk.red(`Backup file does not exist: ${backupPath}`));
      return;
    }

    if (!options.force) {
      spinner.stop();
      console.log(chalk.yellow('\\n⚠️  Warning: This will overwrite your current configuration!'));
      console.log(chalk.white(`Restoring from: ${backupPath}`));
      
      const { proceed } = await inquirer.prompt([{
        type: 'confirm',
        name: 'proceed',
        message: 'Are you sure you want to proceed with the restore?',
        default: false,
      }]);
      
      if (!proceed) {
        console.log(chalk.yellow('Restore cancelled'));
        return;
      }
      
      spinner.start('Restoring backup...');
    }

    try {
      await configEngine.restoreBackup(backupPath);
      spinner.succeed(chalk.green('Backup restored successfully'));
      
      console.log(chalk.yellow('\\nNext steps:'));
      console.log(chalk.white('  1. Restart your AI client(s)'));
      console.log(chalk.white('  2. Verify that your MCP servers are working correctly'));
      console.log(chalk.white('  3. Run "mcp-installer doctor" to check system health'));
      
    } catch (error) {
      spinner.fail(chalk.red('Restore failed'));
      console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'));
      
      console.log(chalk.yellow('\\nTroubleshooting:'));
      console.log(chalk.white('  • Ensure the backup file is valid and accessible'));
      console.log(chalk.white('  • Check file permissions'));
      console.log(chalk.white('  • Try running with --force flag'));
      console.log(chalk.white('  • Run "mcp-installer doctor" for system diagnostics'));
      
      process.exit(1);
    }

  } catch (error) {
    spinner.fail(chalk.red('Restore initialization failed'));
    console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'));
    process.exit(1);
  }
}