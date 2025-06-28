# Development Guide

This guide covers local development, testing, and debugging of the MCP Installer.

## 🚀 Quick Start

### Prerequisites
- **Node.js** >= 18.0.0
- **pnpm** >= 8.0.0 (recommended package manager)

```bash
# Install pnpm globally if not already installed
npm install -g pnpm
```

### Setup
```bash
# Clone and setup
git clone <repository-url>
cd mcp-installer
pnpm install

# Build all packages
pnpm run build

# Navigate to CLI for testing
cd packages/cli
```

### Development Workflow
```bash
# Development mode (auto-rebuild)
pnpm run dev

# Build for production
pnpm run build

# Run tests
pnpm test

# Type checking
pnpm run typecheck

# Linting
pnpm run lint
```

## 🧪 Local Testing Guide

### **1. Quick Test Commands**

Start with these safe commands that don't modify your configs:

```bash
# Navigate to CLI package
cd packages/cli

# Test basic functionality (no actual installation)
node dist/index.js --help
node dist/index.js list --available
node dist/index.js doctor
node dist/index.js install playwright --dry-run
```

### **2. Safe Testing (Recommended)**

**Create test configs** to avoid modifying your real AI client configurations:

```bash
# Create test directory
mkdir ~/test-mcp-configs

# Test with custom config paths
node dist/index.js install filesystem --clients=cursor --dry-run
```

### **3. Real Installation Testing**

⚠️ **Backup first** - these will modify your actual AI client configs:

```bash
# Backup your configs first
node dist/index.js backup --clients=all

# Install to specific client only
node dist/index.js install filesystem --clients=cursor

# Verify installation
node dist/index.js list --installed

# Uninstall to clean up
node dist/index.js uninstall filesystem --clients=cursor
```

### **4. Test Different Scenarios**

```bash
# Test client detection
node dist/index.js doctor

# Test with non-existent server
node dist/index.js install non-existent-server --dry-run

# Test server search
node dist/index.js list --available | grep playwright

# Test specific client
node dist/index.js list --installed --client=cursor
```

### **5. Run Test Suite**

```bash
# Run unit tests (safe - uses mock filesystem)
pnpm test

# Run tests in watch mode
pnpm run test:watch

# Run specific test
pnpm test -- client-manager.test.ts

# Run with coverage
pnpm test -- --coverage
```

### **6. Create Test Alias (Optional)**

```bash
# Create local alias for easier testing
alias mcp-test="node /path/to/mcp-installer/packages/cli/dist/index.js"

# Then use like:
mcp-test list --available
mcp-test install playwright --dry-run
```

### **7. Safe Test Workflow**

```bash
# 1. Check system health
node dist/index.js doctor

# 2. See what's available
node dist/index.js list --available

# 3. Dry run installation
node dist/index.js install filesystem --clients=cursor --dry-run

# 4. Backup configs (if doing real install)
node dist/index.js backup --clients=all

# 5. Real install (optional)
node dist/index.js install filesystem --clients=cursor

# 6. Verify it worked
node dist/index.js list --installed --client=cursor

# 7. Clean up
node dist/index.js uninstall filesystem --clients=cursor
```

### **8. Development Testing**

```bash
# Watch mode for development
pnpm run dev

# In another terminal, test changes immediately
node dist/index.js list --available
```

## 🏗️ Project Structure

```
mcp-installer/
├── packages/
│   ├── cli/              # Main CLI tool
│   │   ├── src/
│   │   │   ├── commands/ # CLI command implementations
│   │   │   ├── core/     # Core functionality
│   │   │   └── index.ts  # CLI entry point
│   │   ├── tests/        # Unit tests
│   │   └── dist/         # Built output
│   ├── shared/           # Shared types and utilities
│   ├── registry/         # MCP server registry
│   └── webapp/           # Web interface (future)
├── docs/                 # Documentation
└── tools/                # Build scripts
```

## 🧪 Testing Architecture

### Unit Tests
- **Jest** + **memfs** for safe filesystem testing
- Mock all external dependencies
- Test individual components in isolation

### Integration Tests
- Test full command workflows
- Use temporary directories for safety
- Validate client detection and config management

### Manual Testing
- Real client configurations
- Actual MCP server installations
- Cross-platform compatibility

## 🛡️ Safety Guidelines

### **Always Use These Safety Measures:**

1. **Start with dry runs**: `--dry-run` flag shows what would happen
2. **Backup before changes**: `mcp-installer backup --clients=all`
3. **Test with single client**: `--clients=cursor` instead of `--clients=all`
4. **Use unit tests**: They're completely safe with mock filesystem
5. **Validate with doctor**: `mcp-installer doctor` checks system health

### **Config File Locations:**
- **Claude Desktop**: `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS)
- **Cursor**: `~/.cursor/mcp.json`
- **Gemini**: `~/.gemini/settings.json`

## 🐛 Debugging

### Common Issues

**"No supported AI clients detected"**
```bash
# Check what's actually detected
node dist/index.js doctor

# Verify config file locations
ls ~/.cursor/mcp.json
ls ~/.gemini/settings.json
```

**Test Failures**
```bash
# Run specific test file
npm test -- config-engine.test.ts

# Debug with verbose output
npm test -- --verbose
```

## 📦 Adding New Features

### Adding New MCP Servers
1. Test the server manually with target clients
2. Add entry to `packages/registry/servers.json`
3. Follow the schema in `packages/registry/schemas/server-schema.json`
5. Test installation: `node dist/index.js install <new-server> --dry-run`

### Adding New Client Support
1. Update `ClientManager` in `packages/cli/src/core/client-manager.ts`
2. Add client type to `packages/shared/src/types/index.ts`
3. Update documentation and tests

## 🚀 **Publishing Workflow with pnpm Workspaces**

### **How Workspace Dependencies Work**

**During Development:**
```json
// packages/cli/package.json
"@mcp-installer/shared": "workspace:*"
```
- pnpm creates symlinks to local packages
- Changes in shared package immediately available in CLI

**During Publishing:**
```bash
# pnpm automatically converts workspace:* to proper versions
"@mcp-installer/shared": "^0.1.0"
```

### **Publishing Steps**

```bash
# 1. Ensure everything is built and tested
pnpm run build
pnpm test

# 2. Publish shared package first
cd packages/shared
pnpm publish

# 3. Publish CLI package (workspace:* auto-converts to ^0.1.0)
cd packages/cli
pnpm publish
```

### Pre-publish Checklist
- [ ] All tests pass: `pnpm test`
- [ ] Build succeeds: `pnpm run build`
- [ ] CLI works locally: `node dist/index.js --help`
- [ ] Documentation is updated
- [ ] Version numbers bumped in both packages

### **Automated Publishing (Recommended)**

Use GitHub Actions for safe, automated publishing:

1. **Manual Release**: Go to Actions → "Publish to NPM" → Run workflow
2. **Test First**: Enable "Dry run" to verify before publishing
3. **Choose Version**: Select patch/minor/major bump

For detailed publishing instructions, see [PUBLISHING.md](../docs/PUBLISHING.md).

## 🤝 Contributing

1. **Fork the repository**
2. **Create feature branch**: `git checkout -b feature/new-feature`
3. **Follow testing guidelines** above
4. **Run full test suite**: `pnpm test`
5. **Submit pull request** with clear description

---

**Remember**: When in doubt, use `--dry-run` and `doctor` commands to understand what the tool will do before making real changes!