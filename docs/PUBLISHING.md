# Publishing Guide

This document explains how to publish the MCP Installer packages to npm using GitHub Actions.

## 📦 Package Publishing Order

**CRITICAL**: Packages must be published in this exact order:

1. **`@mcp-installer/shared`** (shared utilities) - FIRST
2. **`mcp-installer`** (CLI tool) - SECOND

### Why Order Matters

The CLI package depends on the shared package using `workspace:*`:

```json
// packages/cli/package.json
{
  "dependencies": {
    "@mcp-installer/shared": "workspace:*"
  }
}
```

During publishing, pnpm automatically converts this to:

```json
{
  "dependencies": {
    "@mcp-installer/shared": "^0.1.0"
  }
}
```

**The shared package version must exist on npm before the CLI publishes!**

## Publishing Methods

### Method 1: Manual Publishing (Recommended)

Use the GitHub Actions workflow for controlled releases:

1. **Go to Actions tab** in GitHub repository
2. **Select "Publish to NPM"** workflow
3. **Click "Run workflow"**
4. **Choose version bump**:
   - `patch`: Bug fixes (0.1.0 → 0.1.1)
   - `minor`: New features (0.1.0 → 0.2.0)  
   - `major`: Breaking changes (0.1.0 → 1.0.0)
5. **Enable "Dry run"** to test first (recommended)
6. **Click "Run workflow"**

### Method 2: Git Tag Publishing

Push a version tag to trigger automatic publishing:

```bash
# Bump versions locally first
cd packages/shared
npm version patch
cd ../cli  
npm version patch

# Commit and tag
git add .
git commit -m "chore: bump version to 0.1.1"
git tag v0.1.1
git push origin main --tags
```
