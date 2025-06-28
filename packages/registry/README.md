# MCP Server Registry

A curated registry of validated Model Context Protocol (MCP) servers.

## Overview

This registry contains a collection of tested and validated MCP servers that can be easily installed and used. Each server entry includes installation instructions, documentation links, and metadata.

## Structure

- `servers.json` - Main registry file containing all server definitions
- `schemas/server-schema.json` - JSON Schema for validating server entries
- `validate-schema.js` - Validation script

## Usage

### Validate Registry
```bash
npm run validate
```

### Add a New Server
1. Add server entry to `servers.json` following the schema
2. Run validation to ensure compliance
3. Test the server installation

## Server Entry Format

Each server must include:
- `id` - Unique identifier (lowercase, alphanumeric, hyphens/underscores)
- `name` - Human-readable name
- `description` - Brief functionality description
- `category` - One of: development, productivity, database, web, ai, utility
- `type` - stdio or http
- `difficulty` - simple, medium, or advanced
- `requiresAuth` - Boolean indicating if authentication is needed
- `installation` - Command and arguments for installation
- `documentation` - Link to documentation

## Categories

- **Development** - Tools for software development
- **Productivity** - General productivity tools
- **Database** - Database access and management
- **Web** - Web services and APIs
- **AI** - AI/ML related services
- **Utility** - General utility functions 