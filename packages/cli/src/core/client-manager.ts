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
    },
    gemini: {
      name: 'Gemini',
      configPaths: [join(homedir(), '.gemini', 'settings.json')],
    },
    'claude-code': {
      name: 'Claude Code',
      configPaths: [
        join(homedir(), '.claude.json'), // Global configuration
      ],
      detectCommand: 'claude',
    },
    vscode: {
      name: 'VS Code',
      configPaths: [
        join(homedir(), '.vscode', 'extensions'),
        join(homedir(), 'Library', 'Application Support', 'Code', 'User'), // macOS
        join(homedir(), '.config', 'Code', 'User'), // Linux
        join(homedir(), 'AppData', 'Roaming', 'Code', 'User'), // Windows
      ],
    },
    windsurf: {
      name: 'Windsurf',
      configPaths: [join(homedir(), '.windsurf', 'settings.json')],
    },
    'qodo-gen': {
      name: 'Qodo Gen',
      configPaths: [],
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

    if (config.configPaths.length > 0) {
      for (const path of config.configPaths) {
        if (existsSync(path)) {
          configPath = path;
          isInstalled = true;
          break;
        }
      }

      if (!isInstalled && config.configPaths.length > 0) {
        configPath = config.configPaths[0];
      }
    }

    if (config.detectCommand) {
      try {
        const { execSync } = await import('child_process');
        execSync(`which ${config.detectCommand}`, { stdio: 'ignore' });
        isInstalled = true;
      } catch {
        // Command not found
      }
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
