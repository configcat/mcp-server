import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { HttpClient } from "../http";
import { z } from "zod";

export function registerConfigsTools(
  server: McpServer,
  http: HttpClient
) {
  server.tool(
    "list_configs",
    "Fetches the list of the Configs that belongs to the given Product identified by the productId parameter, which can be obtained from the list_products tool. A Config is a collection of Feature Flags and Settings and their values.",
    { 
      productId: z
        .string()
        .describe("The identifier of the Product.")
    },
    async (args: any) => {
      const data = await http.request(`/v1/products/${encodeURIComponent(args.productId)}/configs`);
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "create_config",
    "Creates a new Config in a specified Product identified by the productId parameter.",
    {
      productId: z
        .string()
        .describe("The identifier of the Product."),
      name: z
        .string()
        .min(1)
        .max(255)
        .describe("The name of the Config."),
      description: z
        .string()
        .max(1000)
        .describe("The description of the Config.")
        .optional(),
      order: z
        .number()
        .int()
        .describe("The order of the Config represented on the ConfigCat Dashboard. Determined from an ascending sequence of integers.")
        .optional(),
      evaluationVersion: z
        .enum(["v1", "v2"])
        .describe("Determines the evaluation version of a Config. Using 'v2' enables the new features of Config V2.")
        .optional()
    },
    async (args: any) => {
      const createData: any = {
        name: args.name
      };
      if (args.description !== undefined) createData.description = args.description;
      if (args.order !== undefined) createData.order = args.order;
      if (args.evaluationVersion !== undefined) createData.evaluationVersion = args.evaluationVersion;

      const data = await http.request(`/v1/products/${encodeURIComponent(args.productId)}/configs`, {
        method: "POST",
        body: JSON.stringify(createData)
      });
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "get_config",
    "Returns the metadata of a Config identified by the configId.",
    {
      configId: z
        .string()
        .describe("The identifier of the Config.")
    },
    async (args: any) => {
      const data = await http.request(`/v1/configs/${encodeURIComponent(args.configId)}`);
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "update_config",
    "Updates a Config identified by the configId parameter.",
    {
      configId: z
        .string()
        .describe("The identifier of the Config."),
      name: z
        .string()
        .max(255)
        .describe("The name of the Config.")
        .optional(),
      description: z
        .string()
        .max(1000)
        .describe("The description of the Config.")
        .optional(),
      order: z
        .number()
        .int()
        .describe("The order of the Config represented on the ConfigCat Dashboard. Determined from an ascending sequence of integers.")
        .optional()
    },
    async (args: any) => {
      const updateData: any = {};
      if (args.name !== undefined) updateData.name = args.name;
      if (args.description !== undefined) updateData.description = args.description;
      if (args.order !== undefined) updateData.order = args.order;

      const data = await http.request(`/v1/configs/${encodeURIComponent(args.configId)}`, {
        method: "PUT",
        body: JSON.stringify(updateData)
      });
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "delete_config",
    "Removes a Config identified by the configId parameter.",
    {
      configId: z
        .string()
        .describe("The identifier of the Config.")
    },
    async (args: any) => {
      await http.request(`/v1/configs/${encodeURIComponent(args.configId)}`, {
        method: "DELETE"
      });
      return { content: [{ type: "text", text: "Config deleted successfully" }] };
    }
  );
}
