export interface ServerParameter {
  type:
    | 'path'
    | 'file_path'
    | 'directory_path'
    | 'api_key'
    | 'string'
    | 'number'
    | 'boolean'
    | 'url';
  required: boolean;
  description: string;
  placeholder?: string;
  validation?: {
    pattern?: string;
    minLength?: number;
    maxLength?: number;
  };
  default?: string;
}

export interface MCPServer {
  id: string;
  name: string;
  description: string;
  category: 'development' | 'productivity' | 'database' | 'web' | 'ai' | 'utility';
  type: 'stdio' | 'http';
  difficulty: 'simple' | 'medium' | 'advanced';
  requiresAuth: boolean;
  parameters?: Record<string, ServerParameter>;
  installation: {
    command: string;
    args: string[];
    env?: Record<string, string>;
  };
  documentation: string;
  repository?: string;
  tags?: string[];
  version?: string;
  author?: string;
}

export interface MCPServerConfig {
  // Local server configuration
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  cwd?: string;

  // Remote server configuration
  url?: string;
  type?: string;
}

export interface ClientConfig {
  mcpServers: Record<string, MCPServerConfig>;
  [key: string]: any;
}

export interface ClaudeDesktopConfig extends ClientConfig {
  mcpServers: Record<string, MCPServerConfig>;
}

export interface CursorConfig extends ClientConfig {
  mcpServers: Record<string, MCPServerConfig>;
}

export interface GeminiConfig extends ClientConfig {
  theme?: string;
  selectedAuthType?: string;
  mcpServers: Record<string, MCPServerConfig>;
}

export type ClientType = 'claude-desktop' | 'cursor' | 'gemini' | 'claude-code';

export interface ClientInfo {
  type: ClientType;
  name: string;
  configPath: string;
  isInstalled: boolean;
  configExists?: boolean;
  version?: string;
}

export interface InstallationResult {
  success: boolean;
  client: ClientType;
  serverId: string;
  message: string;
  error?: string;
}

export interface BackupInfo {
  timestamp: string;
  client: ClientType;
  configPath: string;
  backupPath: string;
}

export interface InstallationOptions {
  clients?: ClientType[];
  backup?: boolean;
  dryRun?: boolean;
  force?: boolean;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ServerRegistry {
  version: string;
  servers: MCPServer[];
  lastUpdated: string;
}
