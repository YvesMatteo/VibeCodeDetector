#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CheckVibeClient } from './client.js';
import { registerTools } from './tools.js';

// Only support environment variable for API key (CLI flags are visible in ps aux)
const apiKey = process.env.CHECKVIBE_API_KEY;

if (!apiKey) {
  console.error('Error: CHECKVIBE_API_KEY environment variable is required.');
  console.error('Get your API key at https://checkvibe.dev/dashboard/api-keys');
  process.exit(1);
}

const baseUrl = process.env.CHECKVIBE_BASE_URL || 'https://checkvibe.dev';

// Enforce HTTPS to prevent API key leakage over plaintext
if (!baseUrl.startsWith('https://')) {
  console.error('Error: CHECKVIBE_BASE_URL must use HTTPS to protect API key in transit.');
  process.exit(1);
}

const client = new CheckVibeClient(apiKey, baseUrl);

const server = new McpServer({
  name: 'checkvibe',
  version: '1.0.0',
});

registerTools(server, client);

const transport = new StdioServerTransport();
await server.connect(transport);
