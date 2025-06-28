# MCP Installer

**One-click MCP server installation across AI clients**

MCP Installer is a command-line tool that simplifies the installation and management of MCP (Model Context Protocol) servers across different AI clients like Claude Desktop, Cursor, and Gemini.

## 🚀 Quick Start

### Installation

```bash
npm install -g @mcp-installer/cli
```

### Basic Usage

```bash
# Install a server to all detected clients
mcp-installer install playwright

# Install to specific clients
mcp-installer install filesystem --clients=cursor,gemini

# List available servers
mcp-installer list --available

# Check system health
mcp-installer doctor
```

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

## 🎯 Supported Clients

| Client | Status | Config Location |
|--------|---------|----------------|
| **Claude Desktop** | ✅ Supported | `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS)<br/>`~/.claude/claude_desktop_config.json` (Linux) |
| **Cursor** | ✅ Supported | `~/.cursor/mcp.json` |
| **Gemini** | ✅ Supported | `~/.gemini/settings.json` |
| **Claude Code** | 🔄 Planned | CLI managed |
| **VS Code** | 🔄 Planned | Extension-specific |

## 📦 Available MCP Servers

### Development
- **Playwright** - Browser automation and testing
- **GitHub** - Repository management (requires auth)

### Utility  
- **Filesystem** - Secure local file system access
- **SQLite** - Database operations

### Web
- **Brave Search** - Web search capabilities (requires auth)

*Use `mcp-installer list --available` to see the complete list with details.*

## 🔧 Requirements

- **Node.js** >= 18.0.0
- **pnpm** >= 8.0.0 (recommended) or **npm** >= 9.0.0
- At least one supported AI client installed

## 🛠️ Development

For local development, testing, and debugging instructions, see [DEVELOPMENT.md](DEVELOPMENT.md).

### Quick Start
```bash
# Install pnpm globally if needed
npm install -g pnpm

# Clone and setup
git clone <repository-url>
cd mcp-installer
pnpm install
pnpm run build
```

### Testing
```bash
# Safe testing (no real config changes)
cd packages/cli
node dist/index.js --help
node dist/index.js list --available
node dist/index.js doctor

# Run test suite
pnpm test
```

For detailed development workflows, debugging tips, and contribution guidelines, see the [Development Guide](DEVELOPMENT.md).

## 🔒 Security & Safety

- **Automatic Backups**: Configurations are backed up before any changes
- **Atomic Operations**: Changes are applied atomically to prevent corruption
- **Validation**: All configurations are validated before writing
- **Minimal Permissions**: Only requests necessary file system access

## 🐛 Troubleshooting

### Common Issues

**"No supported AI clients detected"**
- Ensure you have Claude Desktop, Cursor, or Gemini installed
- Run `mcp-installer doctor` for detailed diagnostics

**"Server installation failed"**
- Check your internet connection for npm package downloads
- Verify you have the required permissions to write config files
- Some servers require environment variables (check server documentation)

**"Config validation failed"**
- Your existing config file may have syntax errors
- Use `mcp-installer doctor` to identify issues
- Restore from backup if needed: `mcp-installer restore <backup-path>`

### Getting Help
```bash
# System diagnostics
mcp-installer doctor

# Validate configurations
mcp-installer doctor --client=cursor

# List backups
ls ~/.mcp-installer/backups/
```

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Adding New MCP Servers
1. Test the server manually with target clients
2. Add entry to `packages/registry/servers.json`
3. Validate with schema: `npm run validate`
4. Submit pull request with documentation

---

**Made with ❤️ to simplify MCP adoption for everyone**