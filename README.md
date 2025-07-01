# MCP Installer

**One-click MCP server installation across AI clients**

MCP Installer is a command-line tool that simplifies the installation and management of MCP (Model Context Protocol) servers across different AI clients like Claude Desktop, Cursor, and Gemini.

## 🚀 Quick Start

### Installation

```bash
npm install -g @mcp-installer/cli
```

### Install Your First MCP Server

```bash
# Install a server to all detected clients
mcp-installer install playwright

# Install to specific clients
mcp-installer install filesystem --clients=cursor,gemini

# List available servers
mcp-installer list --available
```

## 🎯 Supported Clients

| Client             | Status       |
| ------------------ | ------------ |
| **Claude Code**    | ✅ Supported |
| **Cursor**         | ✅ Supported |
| **Gemini**         | ✅ Supported |
| **Claude Desktop** | ✅ Supported |
| **VS Code**        | 🔄 Planned   |

## 📦 Available MCP Servers

### Development

- **Playwright** - Browser automation and testing capabilities
- **GitHub** - Interact with GitHub repositories, issues, and pull requests (requires auth)

### Utility

- **Filesystem** - Secure local file system access with configurable permissions
- **SQLite** - Query and manage SQLite databases with full CRUD operations

_Use `mcp-installer list --available` to see the complete list with details in a beautiful table format._

## 📋 Commands

### Install Server

```bash
mcp-installer install <server-name> [options]
```

**Options:**

- `--clients <clients>` - Comma-separated list of clients (default: "all")
- `--dry-run` - Show what would be installed without making changes
- `--no-backup` - Skip creating backup before installation
- `--force` - Force installation even if server already exists

**Examples:**

```bash
# Install Playwright to all clients
mcp-installer install playwright

# Install to specific clients only
mcp-installer install github --clients=cursor,gemini

# Dry run to see what would happen
mcp-installer install sqlite --dry-run
```

### Uninstall Server

```bash
mcp-installer uninstall <server-name> [options]
```

**Options:**

- `--clients <clients>` - Comma-separated list of clients (default: "all")
- `--dry-run` - Show what would be uninstalled without making changes
- `--no-backup` - Skip creating backup before uninstallation

### List Servers

```bash
mcp-installer list [options]
```

**Options:**

- `--available` - List available servers from registry
- `--installed` - List installed servers
- `--client <client>` - Show servers for specific client

**Examples:**

```bash
# List all available servers
mcp-installer list --available

# List installed servers for all clients
mcp-installer list --installed

# List servers for specific client
mcp-installer list --installed --client=cursor
```

### Update Registry

```bash
mcp-installer update [options]
```

**Options:**

- `--clear-cache` - Clear the registry cache before updating
- `--show-cache` - Show information about the registry cache

**Examples:**

```bash
# Update server registry from remote source
mcp-installer update

# Clear cache and force fresh download
mcp-installer update --clear-cache

# Show cache information
mcp-installer update --show-cache
```

The update command fetches the latest server registry from the remote source, ensuring you have access to the newest MCP servers without updating the CLI tool itself.

### System Diagnostics

```bash
mcp-installer doctor [options]
```

**Options:**

- `--client <client>` - Check specific client only

### Backup & Restore

```bash
# Create backup
mcp-installer backup [options]

# Restore from backup
mcp-installer restore <backup-path> [options]
```

**Backup Options:**

- `--clients <clients>` - Comma-separated list of clients to backup (default: "all")
- `--output <path>` - Output directory for backups

**Restore Options:**

- `--client <client>` - Restore specific client only
- `--force` - Force restoration without confirmation

## 🔧 Requirements

- **Node.js** >= 18.0.0
- At least one supported AI client installed

## 🔒 Security & Safety

- **Automatic Backups**: Configurations are backed up before any changes
- **Atomic Operations**: Changes are applied atomically to prevent corruption
- **Validation**: All configurations are validated before writing

## 🐛 Troubleshooting

### Common Issues

**"No supported AI clients detected"**

- Ensure you have Claude Desktop, Cursor, or Gemini installed
- Run `mcp-installer doctor` for detailed diagnostics

**"Server installation failed"**

- Check your internet connection for npm package downloads
- Verify you have the required permissions to write config files
- Some servers require environment variables (check server documentation)

### Getting Help

```bash
# System diagnostics
mcp-installer doctor

# Validate configurations
mcp-installer doctor --client=cursor
```

## 🛠️ Development

For local development and testing:

```bash
# Install pnpm globally if needed
npm install -g pnpm

# Clone and setup
git clone <repository-url>
cd mcp-installer
pnpm install
pnpm run build
```

For detailed development workflows, see [DEVELOPMENT.md](DEVELOPMENT.md).

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

**Made with ❤️ to simplify MCP adoption for everyone**
