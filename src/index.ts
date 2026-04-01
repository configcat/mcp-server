#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { HttpClient } from "./http.js";
import { registerConfigCatAPITools } from "./tools/configcat-api.js";
import { registerConfigCatDocsTools } from "./tools/configcat-docs.js";

const serverName = "ConfigCat MCP";
const serverVersion = "0.1.6";

const http = new HttpClient(`${serverName}/${serverVersion}`);

const server = new McpServer(
  { name: serverName, version: serverVersion },
  { capabilities: { tools: {} } }
);

async function main() {
  registerConfigCatAPITools(server, http);
  await registerConfigCatDocsTools(server, http);

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
