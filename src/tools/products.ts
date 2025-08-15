import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { HttpClient } from "../http";
import { z } from "zod";

export function registerProductsTools(
  server: McpServer,
  http: HttpClient
) {
  server.tool(
    "list_products",
    "Fetches all products from the ConfigCat API. Product is a collection of Configs, Environments and Team members.",
    {},
    async () => {
      const data = await http.request("/v1/products");
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "get_product",
    "Returns the metadata of a Product identified by the productId.",
    {
      productId: z
        .string()
        .describe("The identifier of the Product.")
    },
    async (args: any) => {
      const data = await http.request(`/v1/products/${encodeURIComponent(args.productId)}`);
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "update_product",
    "Updates an existing Product identified by the productId parameter.",
    {
      productId: z
        .string()
        .describe("The identifier of the Product."),
      name: z
        .string()
        .describe("The name of the Product.")
        .optional(),
      description: z
        .string()
        .describe("The description of the Product.")
        .optional(),
      order: z
        .number()
        .describe("The order of the Product represented on the ConfigCat Dashboard. Determined from an ascending sequence of integers.")
        .optional()
    },
    async (args: any) => {
      const updateData: any = {};
      if (args.name !== undefined) updateData.name = args.name;
      if (args.description !== undefined) updateData.description = args.description;
      if (args.order !== undefined) updateData.order = args.order;

      const data = await http.request(`/v1/products/${encodeURIComponent(args.productId)}`, {
        method: "PUT",
        body: JSON.stringify(updateData)
      });
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "delete_product",
    "Removes a Product identified by the productId parameter.",
    {
      productId: z
        .string()
        .describe("The identifier of the Product.")
    },
    async (args: any) => {
      await http.request(`/v1/products/${encodeURIComponent(args.productId)}`, {
        method: "DELETE"
      });
      return { content: [{ type: "text", text: "Product deleted successfully" }] };
    }
  );

  server.tool(
    "get_product_preferences",
    "Returns the preferences of a Product identified by the productId.",
    {
      productId: z
        .string()
        .describe("The identifier of the Product.")
    },
    async (args: any) => {
      const data = await http.request(`/v1/products/${encodeURIComponent(args.productId)}/preferences`);
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "update_product_preferences",
    "Updates the preferences of a Product identified by the productId parameter.",
    {
      productId: z
        .string()
        .describe("The identifier of the Product."),
      reasonRequired: z
        .boolean()
        .describe("Indicates that a mandatory note is required for saving and publishing.")
        .optional(),
      keyGenerationMode: z
        .enum(["camelCase", "lowerCase", "upperCase", "pascalCase", "kebabCase"])
        .describe("Determines the Feature Flag key generation mode.")
        .optional(),
      showVariationId: z
        .boolean()
        .describe("Indicates whether a variation ID's must be shown on the ConfigCat Dashboard.")
        .optional(),
      mandatorySettingHint: z
        .boolean()
        .describe("Indicates whether Feature flags and Settings must have a hint.")
        .optional(),
      reasonRequiredEnvironments: z
        .array(z.object({}))
        .describe("List of Environments where mandatory note must be set before saving and publishing.")
        .optional()
    },
    async (args: any) => {
      const preferences: any = {};
      if (args.reasonRequired !== undefined) preferences.reasonRequired = args.reasonRequired;
      if (args.keyGenerationMode !== undefined) preferences.keyGenerationMode = args.keyGenerationMode;
      if (args.showVariationId !== undefined) preferences.showVariationId = args.showVariationId;
      if (args.mandatorySettingHint !== undefined) preferences.mandatorySettingHint = args.mandatorySettingHint;
      if (args.reasonRequiredEnvironments !== undefined) preferences.reasonRequiredEnvironments = args.reasonRequiredEnvironments;

      const data = await http.request(`/v1/products/${encodeURIComponent(args.productId)}/preferences`, {
        method: "POST",
        body: JSON.stringify(preferences)
      });
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "create_product",
    "Creates a new Product in a specified Organization identified by the organizationId parameter.",
    {
      organizationId: z
        .string()
        .describe("The identifier of the Organization."),
      name: z
        .string()
        .min(1)
        .max(1000)
        .describe("The name of the Product."),
      description: z
        .string()
        .max(1000)
        .describe("The description of the Product.")
        .optional(),
      order: z
        .number()
        .int()
        .describe("The order of the Product represented on the ConfigCat Dashboard. Determined from an ascending sequence of integers.")
        .optional()
    },
    async (args: any) => {
      const createData: any = {
        name: args.name
      };
      if (args.description !== undefined) createData.description = args.description;
      if (args.order !== undefined) createData.order = args.order;

      const data = await http.request(`/v1/organizations/${encodeURIComponent(args.organizationId)}/products`, {
        method: "POST",
        body: JSON.stringify(createData)
      });
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );
}
