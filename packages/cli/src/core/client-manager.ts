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
    }
  > = {
    'claude-desktop': {
      name: 'Claude Desktop',
      configPaths: [
        join(homedir(), 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json'), // macOS
        join(homedir(), '.claude', 'claude_desktop_config.json'), // Linux
        join(homedir(), 'AppData', 'Roaming', 'Claude', 'claude_desktop_config.json'), // Windows
      ],
    },
    cursor: {
      name: 'Cursor',
      configPaths: [join(homedir(), '.cursor', 'mcp.json')],
      detectCommand: 'cursor',
    },
    gemini: {
      name: 'Gemini',
      configPaths: [join(homedir(), '.gemini', 'settings.json')], //TODO: Verify for linux and Windows
      detectCommand: 'gemini',
    },
    'claude-code': {
      name: 'Claude Code',
      configPaths: [
        join(homedir(), '.claude.json'), // Global configuration TODO: Verify for linux and Windows
      ],
      detectCommand: 'claude',
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

    // Check if config file exists
    if (config.configPaths.length > 0) {
      for (const path of config.configPaths) {
        if (existsSync(path)) {
          configPath = path;
          configExists = true;
          break;
        }
      }

      // Always set configPath to the primary path
      if (!configPath && config.configPaths.length > 0) {
        configPath = config.configPaths[0];
      }
    }

    // Check if app is installed via command
    if (config.detectCommand) {
      try {
        const { execSync } = await import('child_process');
        execSync(`which ${config.detectCommand}`, { stdio: 'ignore' });
        isInstalled = true;
      } catch {
        // Command not found
      }
    }

    // Fallback: if config exists, assume app is installed
    if (!isInstalled && configExists) {
      isInstalled = true;
    }

    return {
      type,
      name: config.name,
      configPath,
      isInstalled,
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
}
