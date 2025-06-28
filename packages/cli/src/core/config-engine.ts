import fsExtra from 'fs-extra';
const { readFile, writeFile, ensureDir, copy } = fsExtra;
import { dirname, join } from 'path';
import { existsSync } from 'fs';
import { 
  ClientType, 
  ClientConfig, 
  MCPServerConfig, 
  ValidationResult,
  BackupInfo
} from '@mcp-installer/shared';

export class ConfigEngine {
  private static readonly BACKUP_DIR = join(process.env.HOME || process.env.USERPROFILE || '~', '.mcp-installer', 'backups');

  async readConfig(configPath: string): Promise<ClientConfig> {
    try {
      if (!existsSync(configPath)) {
        return { mcpServers: {} };
      }

      const content = await readFile(configPath, 'utf-8');
      const config = JSON.parse(content) as ClientConfig;
      
      if (!config.mcpServers) {
        config.mcpServers = {};
      }

      return config;
    } catch (error) {
      throw new Error(`Failed to read config from ${configPath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async writeConfig(configPath: string, config: ClientConfig): Promise<void> {
    try {
      await ensureDir(dirname(configPath));
      const content = JSON.stringify(config, null, 2);
      await writeFile(configPath, content, 'utf-8');
    } catch (error) {
      throw new Error(`Failed to write config to ${configPath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async installServer(
    configPath: string,
    serverId: string,
    serverConfig: MCPServerConfig,
    options: { backup?: boolean; force?: boolean } = {}
  ): Promise<void> {
    const config = await this.readConfig(configPath);

    if (config.mcpServers[serverId] && !options.force) {
      throw new Error(`Server '${serverId}' is already installed. Use --force to overwrite.`);
    }

    if (options.backup !== false) {
      await this.createBackup(configPath);
    }

    config.mcpServers[serverId] = serverConfig;
    await this.writeConfig(configPath, config);
  }

  async uninstallServer(
    configPath: string,
    serverId: string,
    options: { backup?: boolean } = {}
  ): Promise<void> {
    const config = await this.readConfig(configPath);

    if (!config.mcpServers[serverId]) {
      throw new Error(`Server '${serverId}' is not installed.`);
    }

    if (options.backup !== false) {
      await this.createBackup(configPath);
    }

    delete config.mcpServers[serverId];
    await this.writeConfig(configPath, config);
  }

  async listInstalledServers(configPath: string): Promise<Record<string, MCPServerConfig>> {
    const config = await this.readConfig(configPath);
    return config.mcpServers || {};
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
        
        if (!config.mcpServers) {
          result.warnings.push('No mcpServers section found in config');
          return result;
        }

        for (const [serverId, serverConfig] of Object.entries(config.mcpServers)) {
          if (!serverConfig) {
            result.errors.push(`Server '${serverId}' has empty configuration`);
            result.isValid = false;
            continue;
          }

          // Check if it's a remote server (has url) or local server (has command)
          const isRemoteServer = !!serverConfig.url;
          const isLocalServer = !!serverConfig.command;

          if (!isRemoteServer && !isLocalServer) {
            result.errors.push(`Server '${serverId}' must have either 'command' (for local servers) or 'url' (for remote servers)`);
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
            result.errors.push(`Server '${serverId}' cannot have both 'url' and 'command' - choose one`);
            result.isValid = false;
          }
        }
      } catch (parseError) {
        result.errors.push(`Invalid JSON format: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
        result.isValid = false;
      }
    } catch (error) {
      result.errors.push(`Failed to read config: ${error instanceof Error ? error.message : 'Unknown error'}`);
      result.isValid = false;
    }

    return result;
  }

  async createBackup(configPath: string): Promise<BackupInfo> {
    if (!existsSync(configPath)) {
      throw new Error(`Config file does not exist: ${configPath}`);
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `${basename(configPath)}.${timestamp}.backup`;
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
    if (configPath.includes('Claude')) return 'claude-desktop';
    if (configPath.includes('.vscode') || configPath.includes('Code')) return 'vscode';
    if (configPath.includes('.windsurf')) return 'windsurf';
    return 'claude-desktop'; // default
  }

  private inferOriginalPath(_backupPath: string): string {
    // Extract original path from backup filename
    // This is a simplified implementation
    // This would need more sophisticated logic to determine the original path
    throw new Error('Cannot infer original path from backup. Please specify target path.');
  }
}

function basename(path: string): string {
  return path.split('/').pop() || path.split('\\').pop() || path;
}