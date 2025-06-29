#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { installCommand } from './commands/install.js';
import { uninstallCommand } from './commands/uninstall.js';
import { listCommand } from './commands/list.js';
import { doctorCommand } from './commands/doctor.js';
import { backupCommand } from './commands/backup.js';
import { restoreCommand } from './commands/restore.js';

// Get version from package.json dynamically
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packagePath = join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(readFileSync(packagePath, 'utf-8'));

const program = new Command();

program
  .name('mcp-installer')
  .description('One-click MCP server installation across AI clients')
  .version(packageJson.version);

program
  .command('install')
  .description('Install an MCP server')
  .argument('<server-name>', 'Name of the MCP server to install')
  .option('-c, --clients <clients>', 'Comma-separated list of clients (e.g., cursor,gemini)', 'all')
  .option('--dry-run', 'Show what would be installed without making changes')
  .option('--no-backup', 'Skip creating backup before installation')
  .option('-f, --force', 'Force installation even if server already exists')
  .action(installCommand);

program
  .command('uninstall')
  .description('Uninstall an MCP server')
  .argument('<server-name>', 'Name of the MCP server to uninstall')
  .option('-c, --clients <clients>', 'Comma-separated list of clients (e.g., cursor,gemini)', 'all')
  .option('--dry-run', 'Show what would be uninstalled without making changes')
  .option('--no-backup', 'Skip creating backup before uninstallation')
  .action(uninstallCommand);

program
  .command('list')
  .description('List MCP servers')
  .option('-a, --available', 'List available servers from registry')
  .option('-i, --installed', 'List installed servers')
  .option('-c, --client <client>', 'Show servers for specific client')
  .action(listCommand);

program
  .command('doctor')
  .description('Check system configuration and diagnose issues')
  .option('-c, --client <client>', 'Check specific client only')
  .action(doctorCommand);

program
  .command('backup')
  .description('Backup client configurations')
  .option('-c, --clients <clients>', 'Comma-separated list of clients to backup', 'all')
  .option('-o, --output <path>', 'Output directory for backups')
  .action(backupCommand);

program
  .command('restore')
  .description('Restore client configurations from backup')
  .argument('<backup-path>', 'Path to backup file or directory')
  .option('-c, --client <client>', 'Restore specific client only')
  .option('-f, --force', 'Force restoration without confirmation')
  .action(restoreCommand);

program.on('command:*', () => {
  console.error(chalk.red(`Invalid command: ${program.args.join(' ')}`));
  console.log(chalk.yellow('See --help for available commands'));
  process.exit(1);
});

if (process.argv.length === 2) {
  program.outputHelp();
  process.exit(0);
}

program.parse(process.argv);
