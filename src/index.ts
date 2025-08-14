#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListPromptsRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ReadResourceRequestSchema,
  GetPromptRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { ConfigCatClient } from './configcat-client.js';

const server = new Server(
  {
    name: 'configcat-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      resources: {},
      tools: {},
      prompts: {},
    },
  }
);

const configCatClient = new ConfigCatClient();

server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: await configCatClient.getResources(),
  };
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;
  return await configCatClient.readResource(uri);
});

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: configCatClient.getTools(),
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  return await configCatClient.callTool(name, args || {});
});

server.setRequestHandler(ListPromptsRequestSchema, async () => {
  return {
    prompts: configCatClient.getPrompts(),
  };
});

server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  return await configCatClient.getPrompt(name, args);
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});