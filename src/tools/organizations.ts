import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { HttpClient } from "../http";
import { z } from "zod";

export function registerOrganizationsTools(
  server: McpServer,
  http: HttpClient
) {
  server.tool(
    "list_organizations",
    "Fetches all organizations from the ConfigCat API. An Organization represents a collection of preferences that are valid for all the Products and Members who belong to an Organization. Like billing information, authentication rules or data privacy preferences.",
    {},
    async () => {
      const data = await http.request("/v1/organizations");
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );
}
