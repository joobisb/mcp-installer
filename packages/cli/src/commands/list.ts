import chalk from 'chalk';
import ora from 'ora';
import { ClientManager, ConfigEngine, ServerRegistry } from '../core/index.js';
import { ClientType, getClientDisplayName } from '@mcp-installer/shared';

interface ListOptions {
  available?: boolean;
  installed?: boolean;
  client?: string;
}

export async function listCommand(options: ListOptions): Promise<void> {
  const spinner = ora('Loading...').start();

  try {
    // If no specific option is set, show both available and installed
    const showAvailable = options.available || (!options.installed && !options.available);
    const showInstalled = options.installed || (!options.available && !options.installed);

    if (showAvailable) {
      spinner.text = 'Loading server registry...';
      const serverRegistry = new ServerRegistry();
      const servers = await serverRegistry.getAllServers();

      spinner.succeed(chalk.green('Available MCP Servers:'));
      
      if (servers.length === 0) {
        console.log(chalk.yellow('  No servers found in registry'));
        return;
      }

      // Group servers by category
      const categories = await serverRegistry.getCategories();
      
      for (const category of categories.sort()) {
        const categoryServers = await serverRegistry.getServersByCategory(category);
        if (categoryServers.length > 0) {
          console.log(chalk.cyan(`\\n${category.toUpperCase()}:`));
          
          categoryServers.forEach(server => {
            const authIcon = server.requiresAuth ? chalk.yellow('🔐') : '  ';
            const difficultyColor = 
              server.difficulty === 'simple' ? chalk.green :
              server.difficulty === 'medium' ? chalk.yellow : chalk.red;
            
            console.log(`${authIcon} ${chalk.bold(server.name)} (${chalk.dim(server.id)})`);
            console.log(`    ${server.description}`);
            console.log(`    ${difficultyColor(server.difficulty)} • ${server.type} • ${chalk.dim(server.installation.command)}`);
            
            if (server.tags && server.tags.length > 0) {
              console.log(`    Tags: ${server.tags.map(tag => chalk.blue(tag)).join(', ')}`);
            }
          });
        }
      }

      const stats = await serverRegistry.getServerStats();
      console.log(chalk.dim(`\\nTotal: ${stats.total} servers`));
    }

    if (showInstalled) {
      if (showAvailable) {
        console.log('\\n' + '─'.repeat(60));
      }

      spinner.start('Detecting installed clients...');
      const clientManager = new ClientManager();
      const configEngine = new ConfigEngine();
      const allClients = await clientManager.detectInstalledClients();

      let targetClients = allClients.filter(c => c.isInstalled);

      if (options.client) {
        const clientType = options.client as ClientType;
        if (!clientManager.isClientSupported(clientType)) {
          spinner.fail(chalk.red(`Unsupported client: ${clientType}`));
          console.log(chalk.yellow(`Supported clients: ${clientManager.getSupportedClients().join(', ')}`));
          return;
        }
        
        const clientInfo = allClients.find(c => c.type === clientType);
        if (!clientInfo?.isInstalled) {
          spinner.fail(chalk.red(`Client '${getClientDisplayName(clientType)}' not detected`));
          return;
        }
        
        targetClients = [clientInfo];
      }

      if (targetClients.length === 0) {
        spinner.succeed(chalk.yellow('No supported AI clients detected'));
        console.log(chalk.dim('Supported clients: Claude Desktop, Cursor, Gemini'));
        return;
      }

      spinner.succeed(chalk.green('Installed MCP Servers:'));
      
      let totalInstalled = 0;

      for (const client of targetClients) {
        try {
          const installedServers = await configEngine.listInstalledServers(client.configPath);
          const serverIds = Object.keys(installedServers);
          
          console.log(chalk.cyan(`\\n${getClientDisplayName(client.type)}:`));
          
          if (serverIds.length === 0) {
            console.log(chalk.dim('  No MCP servers installed'));
            continue;
          }

          serverIds.forEach(serverId => {
            const config = installedServers[serverId];
            console.log(`  ${chalk.bold(serverId)}`);
            console.log(`    Command: ${config.command} ${config.args?.join(' ') || ''}`);
            if (config.env && Object.keys(config.env).length > 0) {
              console.log(`    Environment: ${Object.keys(config.env).join(', ')}`);
            }
          });

          totalInstalled += serverIds.length;
        } catch (error) {
          console.log(chalk.red(`  Error reading config: ${error instanceof Error ? error.message : 'Unknown error'}`));
        }
      }

      console.log(chalk.dim(`\\nTotal installed: ${totalInstalled} servers across ${targetClients.length} client(s)`));
    }

  } catch (error) {
    spinner.fail(chalk.red('Failed to list servers'));
    console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'));
    process.exit(1);
  }
}