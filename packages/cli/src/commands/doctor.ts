import chalk from 'chalk';
import ora from 'ora';
import { existsSync } from 'fs';
import { ClientManager, ConfigEngine, ServerRegistry } from '../core/index.js';
import { ClientType, getClientDisplayName } from '@mcp-installer/shared';

interface DoctorOptions {
  client?: string;
}

export async function doctorCommand(options: DoctorOptions): Promise<void> {
  const spinner = ora('Running system diagnostics...').start();

  try {
    const clientManager = new ClientManager();
    const configEngine = new ConfigEngine();
    const serverRegistry = new ServerRegistry();

    let hasIssues = false;

    console.log(chalk.cyan('\\n🔍 MCP Installer System Diagnostics\\n'));

    // Check Node.js version
    spinner.text = 'Checking Node.js version...';
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.substring(1).split('.')[0]);
    
    if (majorVersion >= 18) {
      console.log(chalk.green('✓ Node.js version:'), nodeVersion);
    } else {
      console.log(chalk.red('✗ Node.js version:'), nodeVersion, chalk.red('(requires >= 18.0.0)'));
      hasIssues = true;
    }

    // Check npm availability
    spinner.text = 'Checking npm availability...';
    try {
      const { execSync } = await import('child_process');
      const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
      console.log(chalk.green('✓ npm version:'), npmVersion);
    } catch {
      console.log(chalk.red('✗ npm not found or not accessible'));
      hasIssues = true;
    }

    // Check server registry
    spinner.text = 'Checking server registry...';
    try {
      await serverRegistry.loadRegistry();
      const stats = await serverRegistry.getServerStats();
      console.log(chalk.green('✓ Server registry:'), `${stats.total} servers loaded`);
    } catch (error) {
      console.log(chalk.red('✗ Server registry:'), error instanceof Error ? error.message : 'Unknown error');
      hasIssues = true;
    }

    // Check AI clients
    spinner.text = 'Detecting AI clients...';
    const allClients = await clientManager.detectInstalledClients();
    
    let targetClients = allClients;
    if (options.client) {
      const clientType = options.client as ClientType;
      if (!clientManager.isClientSupported(clientType)) {
        console.log(chalk.red(`✗ Unsupported client: ${clientType}`));
        console.log(chalk.yellow(`Supported clients: ${clientManager.getSupportedClients().join(', ')}`));
        return;
      }
      targetClients = allClients.filter(c => c.type === clientType);
    }

    console.log(chalk.cyan('\\nAI Client Status:'));
    
    for (const client of targetClients) {
      const displayName = getClientDisplayName(client.type);
      
      if (client.isInstalled) {
        console.log(chalk.green(`✓ ${displayName}:`), 'Detected');
        
        // Check config file
        if (client.configPath) {
          if (existsSync(client.configPath)) {
            console.log(`  Config: ${chalk.dim(client.configPath)}`);
            
            // Validate config
            try {
              const validation = await configEngine.validateConfig(client.configPath);
              if (validation.isValid) {
                console.log(chalk.green('  ✓ Config is valid'));
              } else {
                console.log(chalk.red('  ✗ Config has errors:'));
                validation.errors.forEach(error => {
                  console.log(chalk.red(`    • ${error}`));
                });
                hasIssues = true;
              }
              
              if (validation.warnings.length > 0) {
                console.log(chalk.yellow('  ⚠ Config warnings:'));
                validation.warnings.forEach(warning => {
                  console.log(chalk.yellow(`    • ${warning}`));
                });
              }
              
              // List installed servers
              const installedServers = await configEngine.listInstalledServers(client.configPath);
              const serverCount = Object.keys(installedServers).length;
              if (serverCount > 0) {
                console.log(chalk.blue(`  📦 ${serverCount} MCP server(s) installed`));
                Object.keys(installedServers).forEach(serverId => {
                  console.log(chalk.dim(`    • ${serverId}`));
                });
              } else {
                console.log(chalk.dim('  📦 No MCP servers installed'));
              }
              
            } catch (error) {
              console.log(chalk.red('  ✗ Failed to validate config:'), error instanceof Error ? error.message : 'Unknown error');
              hasIssues = true;
            }
          } else {
            console.log(chalk.yellow('  ⚠ Config file does not exist:'), chalk.dim(client.configPath));
            console.log(chalk.dim('    Will be created automatically during installation'));
          }
        }
      } else {
        console.log(chalk.yellow(`⚠ ${displayName}:`), 'Not detected');
        if (client.configPath) {
          console.log(chalk.dim(`  Expected config: ${client.configPath}`));
        }
      }
    }

    // Environment checks
    console.log(chalk.cyan('\\nEnvironment:'));
    console.log(chalk.green('✓ Platform:'), process.platform);
    console.log(chalk.green('✓ Architecture:'), process.arch);
    console.log(chalk.green('✓ Home directory:'), process.env.HOME || process.env.USERPROFILE || 'Unknown');

    // Summary
    spinner.succeed(chalk.green('Diagnostics completed'));
    
    console.log(chalk.cyan('\\n📋 Summary:'));
    if (hasIssues) {
      console.log(chalk.red('✗ Issues detected that may affect functionality'));
      console.log(chalk.yellow('Please address the errors above before proceeding'));
    } else {
      console.log(chalk.green('✓ System appears healthy and ready for MCP server installation'));
    }
    
    const installedClientCount = allClients.filter(c => c.isInstalled).length;
    if (installedClientCount === 0) {
      console.log(chalk.yellow('\\n💡 No AI clients detected. Please install one of the supported clients:'));
      console.log(chalk.white('  • Claude Desktop'));
      console.log(chalk.white('  • Cursor'));
      console.log(chalk.white('  • Gemini'));
    } else {
      console.log(chalk.green(`\\n✓ ${installedClientCount} AI client(s) ready for MCP server installation`));
    }

  } catch (error) {
    spinner.fail(chalk.red('Diagnostics failed'));
    console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'));
    process.exit(1);
  }
}