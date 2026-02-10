#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CheckVibeClient } from './client.js';
import { registerTools } from './tools.js';

const apiKey = process.env.CHECKVIBE_API_KEY
  || process.argv.find(a => a.startsWith('--api-key='))?.split('=')[1];

if (!apiKey) {
  console.error('Error: CHECKVIBE_API_KEY environment variable or --api-key flag is required.');
  console.error('Get your API key at https://checkvibe.dev/dashboard/api-keys');
  process.exit(1);
}

const baseUrl = process.env.CHECKVIBE_BASE_URL || 'https://checkvibe.dev';

const client = new CheckVibeClient(apiKey, baseUrl);

const server = new McpServer({
  name: 'checkvibe',
  version: '1.0.0',
});

registerTools(server, client);

const transport = new StdioServerTransport();
await server.connect(transport);
