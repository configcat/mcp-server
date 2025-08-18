import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { HttpClient } from "./http.js";
import { registerProductsTools } from "./tools/products.js";
import { registerOrganizationsTools } from "./tools/organizations.js";
import { registerConfigsTools } from "./tools/configs.js";
import { registerFeatureFlagsTools } from "./tools/featureFlags.js";

const baseUrl: string = process.env.CONFIGCAT_BASE_URL || "https://api.configcat.com";
const username: string = process.env.CONFIGCAT_USERNAME || process.env.CONFIGCAT_PUBLIC_API_USERNAME || "";
const password: string = process.env.CONFIGCAT_PASSWORD || process.env.CONFIGCAT_PUBLIC_API_PASSWORD || "";

const http = new HttpClient({ baseUrl, username, password, userAgent: "configcat-mcp/0.1.0" });

const server = new McpServer(
  {
    name: "ConfigCat MCP",
    version: "0.1.0"
  }
);

registerOrganizationsTools(server, http);
registerProductsTools(server, http);
registerConfigsTools(server, http);
registerFeatureFlagsTools(server, http);

async function main() {
  if (!username || !password) {
    throw new Error("Please set CONFIGCAT_USERNAME and CONFIGCAT_PASSWORD environment variables (Public API credentials)");
  }
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
