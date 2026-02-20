#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { HttpClient } from "./http.js";
import { registerConfigCatAPITools } from "./tools/configcat-api.js";
import { registerConfigCatDocsTools } from "./tools/configcat-docs.js";

const baseUrl: string = process.env.CONFIGCAT_BASE_URL ?? "https://api.configcat.com";
const username: string = process.env.CONFIGCAT_API_USER ?? "";
const password: string = process.env.CONFIGCAT_API_PASS ?? "";

const serverName = "ConfigCat MCP";
const serverVersion = "0.1.5";

const http = new HttpClient({ baseUrl, username, password, userAgent: `${serverName}/${serverVersion}` });

const server = new McpServer(
  { name: serverName, version: serverVersion },
  { capabilities: { tools: {} } }
);

async function main() {
  if (!username || !password) {
    throw new Error("Please set CONFIGCAT_API_USER and CONFIGCAT_API_PASS environment variables (Public API credentials). You can create your credentials on the Public API credentials management page: https://app.configcat.com/my-account/public-api-credentials.");
  }

  registerConfigCatAPITools(server, http);
  await registerConfigCatDocsTools(server, http);

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
