import fsExtra from 'fs-extra';
const { readFile, writeFile, ensureDir, copy } = fsExtra;
import { dirname, join, basename } from 'path';
import { existsSync } from 'fs';
import {
  ClientType,
  ClientConfig,
  MCPServerConfig,
  ValidationResult,
  BackupInfo,
} from '@mcp-installer/shared';
import { ClientManager } from './client-manager.js';

export class ConfigEngine {
  private static readonly BACKUP_DIR = join(
    process.env.HOME || process.env.USERPROFILE || '~',
    '.mcp-installer',
    'backups'
  );

  private clientType?: ClientType;
  private clientManager: ClientManager;

  constructor(clientType?: ClientType) {
    this.clientType = clientType;
    this.clientManager = new ClientManager();
  }

  private getConfigKey(): string {
    if (!this.clientType) return 'mcpServers'; // backward compatibility

    const config = this.clientManager.getClientConfig(this.clientType);
    if (!config?.configTemplate) return 'mcpServers';

    const keys = Object.keys(config.configTemplate);
    return keys.length > 0 ? keys[0] : 'mcpServers';
  }

  async readConfig(configPath: string): Promise<ClientConfig> {
    try {
      const configKey = this.getConfigKey();

      if (!existsSync(configPath)) {
        return { [configKey]: {} } as ClientConfig;
      }

      const content = await readFile(configPath, 'utf-8');
      const config = JSON.parse(content) as ClientConfig;

      if (!config[configKey]) {
        config[configKey] = {};
      }

      return config;
    } catch (error) {
      throw new Error(
        `Failed to read config from ${configPath}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async writeConfig(configPath: string, config: ClientConfig): Promise<void> {
    try {
      await ensureDir(dirname(configPath));
      const content = JSON.stringify(config, null, 2);
      await writeFile(configPath, content, 'utf-8');
    } catch (error) {
      if (error instanceof Error) {
        // Check for permission errors
        if (error.message.includes('EACCES') || error.message.includes('permission denied')) {
          const clientType = this.inferClientFromPath(configPath);
          const clientName = this.getClientDisplayName(clientType);

          throw new Error(
            `Permission denied when writing to ${configPath}.\n\n` +
              `This typically happens when the ${clientName} config file is protected.\n` +
              `Try running the command with sudo:\n` +
              `  sudo mcp-installer install <server-name> --clients=${clientType}\n\n` +
              `Or manually change the file permissions:\n` +
              `  sudo chmod 644 ${configPath}\n` +
              `  sudo chown $USER ${configPath}`
          );
        }

        // Check for directory permission errors
        if (error.message.includes('ENOENT') && error.message.includes('mkdir')) {
          const dirPath = dirname(configPath);
          throw new Error(
            `Cannot create directory ${dirPath}.\n\n` +
              `Try creating the directory manually:\n` +
              `  mkdir -p ${dirPath}\n\n` +
              `Or run with sudo if needed:\n` +
              `  sudo mkdir -p ${dirPath}\n` +
              `  sudo chown $USER ${dirPath}`
          );
        }
      }

      throw new Error(
        `Failed to write config to ${configPath}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Check if a server is already installed in a client config
   */
  async isServerInstalled(configPath: string, serverId: string): Promise<boolean> {
    try {
      const config = await this.readConfig(configPath);
      const configKey = this.getConfigKey();
      return !!config[configKey]?.[serverId];
    } catch {
      return false;
    }
  }

  async installServer(
    configPath: string,
    serverId: string,
    serverConfig: MCPServerConfig,
    options: { backup?: boolean; force?: boolean } = {}
  ): Promise<void> {
    const config = await this.readConfig(configPath);
    const configKey = this.getConfigKey();

    if (config[configKey]?.[serverId] && !options.force) {
      throw new Error(`Server '${serverId}' is already installed. Use --force to overwrite.`);
    }

    if (options.backup !== false) {
      await this.createBackup(configPath);
    }

    if (!config[configKey]) {
      config[configKey] = {};
    }
    config[configKey][serverId] = serverConfig;
    await this.writeConfig(configPath, config);
  }

  async uninstallServer(
    configPath: string,
    serverId: string,
    options: { backup?: boolean } = {}
  ): Promise<void> {
    const config = await this.readConfig(configPath);
    const configKey = this.getConfigKey();

    if (!config[configKey]?.[serverId]) {
      throw new Error(`Server '${serverId}' is not installed.`);
    }

    if (options.backup !== false) {
      await this.createBackup(configPath);
    }

    delete config[configKey][serverId];
    await this.writeConfig(configPath, config);
  }

  async listInstalledServers(configPath: string): Promise<Record<string, MCPServerConfig>> {
    const config = await this.readConfig(configPath);
    const configKey = this.getConfigKey();
    return config[configKey] || {};
  }

  async validateConfig(configPath: string): Promise<ValidationResult> {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
    };

    try {
      if (!existsSync(configPath)) {
        result.warnings.push(`Config file does not exist: ${configPath}`);
        return result;
      }

      const content = await readFile(configPath, 'utf-8');

      try {
        const config = JSON.parse(content) as ClientConfig;
        const configKey = this.getConfigKey();

        if (!config[configKey]) {
          result.warnings.push(`No ${configKey} section found in config`);
          return result;
        }

        const serverConfigs = config[configKey] as Record<string, MCPServerConfig>;
        for (const [serverId, serverConfig] of Object.entries(serverConfigs)) {
          if (!serverConfig) {
            result.errors.push(`Server '${serverId}' has empty configuration`);
            result.isValid = false;
            continue;
          }

          // Check if it's a remote server (has url) or local server (has command)
          const isRemoteServer = !!serverConfig.url;
          const isLocalServer = !!serverConfig.command;

          if (!isRemoteServer && !isLocalServer) {
            result.errors.push(
              `Server '${serverId}' must have either 'command' (for local servers) or 'url' (for remote servers)`
            );
            result.isValid = false;
          }

          // Validate local server configuration
          if (isLocalServer) {
            if (serverConfig.args && !Array.isArray(serverConfig.args)) {
              result.errors.push(`Server '${serverId}' 'args' must be an array`);
              result.isValid = false;
            }

            if (serverConfig.env && typeof serverConfig.env !== 'object') {
              result.errors.push(`Server '${serverId}' 'env' must be an object`);
              result.isValid = false;
            }
          }

          // Validate remote server configuration
          if (isRemoteServer) {
            if (typeof serverConfig.url !== 'string') {
              result.errors.push(`Server '${serverId}' 'url' must be a string`);
              result.isValid = false;
            } else {
              // Validate URL format only if url is a string
              try {
                new URL(serverConfig.url);
              } catch {
                result.errors.push(`Server '${serverId}' has invalid URL format`);
                result.isValid = false;
              }
            }

            // Validate type if provided
            if (serverConfig.type && typeof serverConfig.type !== 'string') {
              result.errors.push(`Server '${serverId}' 'type' must be a string`);
              result.isValid = false;
            }
          }

          // Don't allow both url and command
          if (isRemoteServer && isLocalServer) {
            result.errors.push(
              `Server '${serverId}' cannot have both 'url' and 'command' - choose one`
            );
            result.isValid = false;
          }
        }
      } catch (parseError) {
        result.errors.push(
          `Invalid JSON format: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`
        );
        result.isValid = false;
      }
    } catch (error) {
      result.errors.push(
        `Failed to read config: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      result.isValid = false;
    }

    return result;
  }

  async createBackup(configPath: string): Promise<BackupInfo> {
    if (!existsSync(configPath)) {
      throw new Error(`Config file does not exist: ${configPath}`);
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const sanitizedConfigPath = configPath.replace(/[:/\\]/g, '_');
    const backupFileName = `${basename(sanitizedConfigPath)}.${timestamp}.backup`;
    const backupPath = join(ConfigEngine.BACKUP_DIR, backupFileName);

    await ensureDir(ConfigEngine.BACKUP_DIR);
    await copy(configPath, backupPath);

    return {
      timestamp,
      client: this.inferClientFromPath(configPath),
      configPath,
      backupPath,
    };
  }

  async restoreBackup(backupPath: string, targetPath?: string): Promise<void> {
    if (!existsSync(backupPath)) {
      throw new Error(`Backup file does not exist: ${backupPath}`);
    }

    const restorePath = targetPath || this.inferOriginalPath(backupPath);
    await ensureDir(dirname(restorePath));
    await copy(backupPath, restorePath);
  }

  async listBackups(): Promise<BackupInfo[]> {
    // Implementation would scan backup directory and parse filenames
    // For now, return empty array
    return [];
  }

  private inferClientFromPath(configPath: string): ClientType {
    if (configPath.includes('.cursor')) return 'cursor';
    if (configPath.includes('.gemini')) return 'gemini';
    if (configPath.includes('.claude.json')) return 'claude-code';
    if (configPath.includes('.vscode')) return 'vscode';
    if (configPath.includes('Claude')) return 'claude-desktop';
    return 'claude-desktop'; // default
  }

  private getClientDisplayName(type: ClientType): string {
    const displayNames: Record<ClientType, string> = {
      'claude-desktop': 'Claude Desktop',
      cursor: 'Cursor',
      gemini: 'Gemini',
      'claude-code': 'Claude Code',
      vscode: 'Visual Studio Code',
    };
    return displayNames[type] || type;
  }

  private inferOriginalPath(_backupPath: string): string {
    // Extract original path from backup filename
    // This is a simplified implementation
    // This would need more sophisticated logic to determine the original path
    throw new Error('Cannot infer original path from backup. Please specify target path.');
  }
}
