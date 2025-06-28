# MCP Installer CLI

The command-line tool for installing and managing MCP servers across AI clients.

## Installation

```bash
npm install -g mcp-installer
```

## Usage

See the main [README](../../README.md) for complete usage documentation.

## Development

### Local Development

```bash
# Install dependencies
npm install

# Build the CLI
npm run build

# Test locally (without global install)
npm run start -- install playwright --dry-run

# Run in development mode with auto-rebuild
npm run dev
```

### Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm test -- --coverage
```

### Building

```bash
# Build TypeScript
npm run build

# Clean build artifacts
npm run clean

# Type check only
npm run typecheck
```

## Project Structure

```
src/
├── commands/          # CLI command implementations
│   ├── install.ts     # Install command
│   ├── uninstall.ts   # Uninstall command
│   ├── list.ts        # List command
│   ├── doctor.ts      # Diagnostics command
│   ├── backup.ts      # Backup command
│   └── restore.ts     # Restore command
├── core/              # Core functionality
│   ├── client-manager.ts   # AI client detection
│   ├── config-engine.ts    # Configuration management
│   └── server-registry.ts  # Server registry management
├── types/             # TypeScript type definitions
└── index.ts           # CLI entry point
```

## Architecture

The CLI is built with the following core components:

- **ClientManager**: Detects and manages AI client installations
- **ConfigEngine**: Safely reads/writes configuration files with backup support
- **ServerRegistry**: Manages the curated list of available MCP servers
- **Commands**: Individual command handlers for each CLI operation

## Error Handling

The CLI implements comprehensive error handling:

- **Validation**: All inputs and configurations are validated
- **Backups**: Automatic backups before configuration changes
- **Atomic Operations**: Changes are applied atomically to prevent corruption
- **User Feedback**: Clear error messages with recovery suggestions