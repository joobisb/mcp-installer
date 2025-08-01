import { homedir } from 'os';
import { join } from 'path';
import { existsSync } from 'fs';
import { ClientInfo, ClientType } from '@mcp-installer/shared';

export class ClientManager {
  private static readonly CLIENT_CONFIGS: Record<
    ClientType,
    {
      name: string;
      configPaths: string[];
      detectCommand?: string;
      autoCreateConfig?: boolean;
      configTemplate?: object;
    }
  > = {
    'claude-desktop': {
      name: 'Claude Desktop',
      configPaths: [
        join(homedir(), 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json'), // macOS
        join(homedir(), '.claude', 'claude_desktop_config.json'), // Linux
        join(homedir(), 'AppData', 'Roaming', 'Claude', 'claude_desktop_config.json'), // Windows
      ],
      autoCreateConfig: true,
      configTemplate: {
        mcpServers: {},
      },
    },
    cursor: {
      name: 'Cursor',
      configPaths: [join(homedir(), '.cursor', 'mcp.json')],
      detectCommand: 'cursor',
      autoCreateConfig: true,
      configTemplate: {
        mcpServers: {},
      },
    },
    gemini: {
      name: 'Gemini',
      configPaths: [join(homedir(), '.gemini', 'settings.json')], //TODO: Verify for linux and Windows
      detectCommand: 'gemini',
      configTemplate: {
        mcpServers: {},
      },
      //settings.json already exists for geming, so no need to auto-create config
    },
    'claude-code': {
      name: 'Claude Code',
      configPaths: [
        join(homedir(), '.claude.json'), // Global configuration TODO: Verify for linux and Windows
      ],
      detectCommand: 'claude',
      configTemplate: {
        mcpServers: {},
      },
      //claude.json already exists for claude-code, so no need to auto-create config
    },
    vscode: {
      name: 'Visual Studio Code',
      configPaths: [
        join(homedir(), 'Library', 'Application Support', 'Code', 'User', 'mcp.json'), // macOS global
        join(homedir(), '.config', 'Code', 'User', 'mcp.json'), // Linux
        join(homedir(), 'AppData', 'Roaming', 'Code', 'mcp.json'), // Windows
        join(homedir(), '.vscode', 'mcp.json'), // Project-level configuration, yet to support project-level config
      ],
      detectCommand: 'code',
      configTemplate: {
        servers: {},
      },
    },
    kiro: {
      name: 'Kiro',
      configPaths: [
        join(homedir(), '.kiro', 'settings', 'mcp.json'), // macOS/Linux
      ],
    },
  };

  async detectInstalledClients(): Promise<ClientInfo[]> {
    const clients: ClientInfo[] = [];

    for (const [type] of Object.entries(ClientManager.CLIENT_CONFIGS)) {
      const clientType = type as ClientType;
      const clientInfo = await this.detectClient(clientType);
      clients.push(clientInfo);
    }

    return clients;
  }

  async detectClient(type: ClientType): Promise<ClientInfo> {
    const config = ClientManager.CLIENT_CONFIGS[type];

    if (!config) {
      return {
        type,
        name: type,
        configPath: '',
        isInstalled: false,
      };
    }

    let configPath = '';
    let isInstalled = false;
    let configExists = false;

    // Always set configPath to the primary path (for potential creation)
    if (config.configPaths.length > 0) {
      configPath = config.configPaths[0];

      // Check if config file exists, and auto-create if needed
      for (const path of config.configPaths) {
        if (existsSync(path)) {
          configPath = path;
          configExists = true;
          break;
        } else {
          // Check if parent directory exists and we can auto-create config
          const { dirname } = await import('path');
          const parentDir = dirname(path);

          if (existsSync(parentDir) && config.autoCreateConfig && config.configTemplate) {
            try {
              const { writeFileSync } = await import('fs');

              // Create the config file with the template
              writeFileSync(path, JSON.stringify(config.configTemplate, null, 2));

              configPath = path;
              configExists = true;
              break;
            } catch (error) {
              // Failed to create config file, continue to next path
              console.warn(`Failed to auto-create config at ${path}:`, error);
            }
          }
        }
      }
    }

    // Primary detection: Check if app is installed via command
    if (config.detectCommand) {
      try {
        const { execSync } = await import('child_process');
        execSync(`which ${config.detectCommand}`, { stdio: 'ignore' });
        isInstalled = true;
      } catch {
        // Command not found
      }
    }

    // Secondary detection: if config exists, assume app is installed
    // (for clients without detectCommand or as fallback)
    if (!isInstalled && configExists) {
      isInstalled = true;
    }

    return {
      type,
      name: config.name,
      configPath,
      isInstalled,
      configExists,
    };
  }

  getConfigPath(type: ClientType): string {
    const config = ClientManager.CLIENT_CONFIGS[type];
    if (!config || config.configPaths.length === 0) {
      throw new Error(`No config path defined for client: ${type}`);
    }
    return config.configPaths[0];
  }

  getSupportedClients(): ClientType[] {
    return Object.keys(ClientManager.CLIENT_CONFIGS) as ClientType[];
  }

  isClientSupported(type: string): type is ClientType {
    return type in ClientManager.CLIENT_CONFIGS;
  }

  getClientConfig(type: ClientType) {
    return ClientManager.CLIENT_CONFIGS[type];
  }
}
