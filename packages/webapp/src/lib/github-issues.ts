interface ServerRequestData {
  serverName: string;
  githubUrl?: string;
  documentationUrl?: string;
  description?: string;
  category?: string;
  userEmail?: string;
}

export function generateGitHubIssueUrl(data: ServerRequestData): string {
  const repoUrl = 'https://github.com/joobisb/mcp-installer';

  // Create the issue title
  const title = `Server Request: ${data.serverName}`;

  // Create the issue body with template
  const body = `## 🚀 MCP Server Request

**Server Name:** ${data.serverName}
**Requested by:** Community member via MCP Installer webapp
**Category:** ${data.category || 'Not specified'}

### 📋 Server Information
- **GitHub URL:** ${data.githubUrl || 'Not provided'}
- **Documentation URL:** ${data.documentationUrl || 'Not provided'}
- **Description:** ${data.description || 'Not provided'}
- **Contact Email:** ${data.userEmail || 'Not provided'}

### 📖 Additional Context
Please provide any additional context about this MCP server, including:
- Installation instructions you've found
- Why this server would be valuable to the community
- Any authentication/configuration requirements

### ✅ Research Checklist (for maintainers)
- [ ] Verify server exists and is functional
- [ ] Determine installation method (npx/pip/docker/manual)
- [ ] Test installation on supported clients (Claude Desktop, Cursor, Gemini)
- [ ] Document required parameters/authentication
- [ ] Add to servers.json registry
- [ ] Validate with test installation

### 🏷️ Labels
This issue should be labeled with: \`server-request\`, \`enhancement\`, \`community-request\`

---
*This issue was auto-generated from the MCP Installer webapp. Thank you for helping improve our server registry!*`;

  // Encode the parameters for URL
  const encodedTitle = encodeURIComponent(title);
  const encodedBody = encodeURIComponent(body);
  const labels = encodeURIComponent('server-request,enhancement,community-request');

  // Construct the GitHub issue URL
  return `${repoUrl}/issues/new?title=${encodedTitle}&body=${encodedBody}&labels=${labels}`;
}

export const serverCategories = [
  'development',
  'productivity',
  'database',
  'web',
  'ai',
  'utility',
  'monitoring',
  'crm',
] as const;

export type ServerCategory = (typeof serverCategories)[number];
