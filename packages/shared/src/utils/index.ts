import { ClientType } from '../types/index.js';

export function getClientDisplayName(type: ClientType): string {
  const displayNames: Record<ClientType, string> = {
    'claude-desktop': 'Claude Desktop',
    cursor: 'Cursor',
    gemini: 'Gemini',
    'claude-code': 'Claude Code',
    vscode: 'Visual Studio Code',
  };
  return displayNames[type] || type;
}

export function formatTimestamp(timestamp: string): string {
  return new Date(timestamp).toLocaleString();
}

export function validateServerId(serverId: string): boolean {
  return /^[a-z0-9-_]+$/.test(serverId);
}

export function sanitizeServerId(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

export function isUrl(str: string): boolean {
  try {
    new URL(str);
    return true;
  } catch {
    return false;
  }
}

export function createId(): string {
  return Math.random().toString(36).substring(2, 15);
}
