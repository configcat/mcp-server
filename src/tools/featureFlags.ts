import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { HttpClient } from "../http";
import { z } from "zod";

export function registerFeatureFlagsTools(
  server: McpServer,
  http: HttpClient
) {
  // Feature Flags & Settings
  server.tool(
    "list_flags",
    "Returns the list of the Feature Flags and Settings defined in a specified Config, identified by the configId parameter.",
    {
      configId: z
        .string()
        .describe("The identifier of the Config.")
    },
    async (args: any) => {
      const data = await http.request(`/v1/configs/${encodeURIComponent(args.configId)}/settings`);
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "create_flag",
    "Creates a new Feature Flag or Setting in a specified Config identified by the configId parameter. The key attribute must be unique within the given Config.",
    {
      configId: z
        .string()
        .describe("The identifier of the Config."),
      hint: z
        .string()
        .min(0)
        .max(1000)
        .describe("A hint or description for the Feature Flag or Setting.")
        .optional(),
      tags: z
        .array(z.number())
        .describe("Array of tag IDs to attach to the Feature Flag or Setting.")
        .optional(),
      order: z
        .number()
        .int()
        .describe("The order of the Setting represented on the ConfigCat Dashboard. Determined from an ascending sequence of integers.")
        .optional(),        
      key: z
        .string()
        .min(1)
        .max(255)
        .describe("The key of the Feature Flag or Setting. Must be unique within the Config."),
      name: z
        .string()
        .min(1)
        .max(255)
        .describe("The name of the Feature Flag or Setting."),
      settingType: z
        .enum(["boolean", "string", "int", "double"])
        .describe("The type of the Feature Flag or Setting."),
      initialValues: z
        .array(z.object({}))
        .describe("the SettingId to initialize the values and tags of the Feature Flag or Setting from. Only can be set if you have at least ReadOnly access in all the Environments. Only one of the SettingIdToInitFrom or the InitialValues properties can be set.")
        .optional(),
      settingIdToInitFrom: z
        .number()
        .int()
        .describe("the SettingId to initialize the values and tags of the Feature Flag or Setting from. Only can be set if you have at least ReadOnly access in all the Environments. Only one of the SettingIdToInitFrom or the InitialValues properties can be set.")
        .optional()
    },
    async (args: any) => {
      const createData: any = {
        key: args.key,
        name: args.name,
        settingType: args.settingType
      };
      
      if (args.hint !== undefined) createData.hint = args.hint;
      if (args.tags !== undefined) createData.tags = args.tags;
      if (args.order !== undefined) createData.order = args.order;
      if (args.initialValues !== undefined) createData.initialValues = args.initialValues;
      if (args.settingIdToInitFrom !== undefined) createData.settingIdToInitFrom = args.settingIdToInitFrom;

      const data = await http.request(`/v1/configs/${encodeURIComponent(args.configId)}/settings`, {
        method: "POST",
        body: JSON.stringify(createData)
      });
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "get_flag",
    "Returns the metadata attributes of a Feature Flag or Setting identified by the settingId parameter.",
    {
      settingId: z
        .number()
        .int()
        .describe("The identifier of the Setting.")
    },
    async (args: any) => {
      const data = await http.request(`/v1/settings/${encodeURIComponent(args.settingId)}`);
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "replace_flag",
    "Replaces the whole value of a Feature Flag or Setting identified by the settingId parameter. As this endpoint is doing a complete replace, it's important to set every other attribute that you don't want to change in its original state.",
    {
      settingId: z
        .number()
        .int()
        .describe("The identifier of the Setting."),
      hint: z
        .string()
        .max(1000)
        .describe("A short description for the setting, shown on the Dashboard UI.")
        .optional(),
      tags: z
        .array(z.number().int())
        .describe("The IDs of the tags which are attached to the setting.")
        .optional(),
      order: z
        .number()
        .int()
        .describe("The order of the Setting represented on the ConfigCat Dashboard. Determined from an ascending sequence of integers.")
        .optional(),
      name: z
        .string()
        .min(1)
        .max(255)
        .describe("The name of the Feature Flag or Setting.")
    },
    async (args: any) => {
      const replaceData: any = {
        name: args.name
      };
      
      if (args.hint !== undefined) replaceData.hint = args.hint;
      if (args.tags !== undefined) replaceData.tags = args.tags;
      if (args.order !== undefined) replaceData.order = args.order;

      const data = await http.request(`/v1/settings/${encodeURIComponent(args.settingId)}`, {
        method: "PUT",
        body: JSON.stringify(replaceData)
      });
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "update_flag",
    "Updates the metadata of a Feature Flag or Setting with a collection of JSON Patch operations in a specified Config. Only the name, hint and tags attributes are modifiable by this endpoint. The tags attribute is a simple collection of the tag IDs attached to the given setting. The advantage of using JSON Patch is that you can describe individual update operations on a resource without touching attributes that you don't want to change.",
    {
      settingId: z
        .number()
        .int()
        .describe("The identifier of the Setting."),
      operations: z
        .array(z.object({
          op: z
            .enum(["add", "remove", "replace", "move", "copy", "test"])
            .describe("The operation type (OperationType)."),
          path: z
            .string()
            .describe("The source path."),
          from: z
            .string()
            .describe("The target path.")
            .optional(),
          value: z
            .any()
            .describe("The discrete value.")
            .optional()
        }))
        .describe("Array of JSON Patch operations to apply to the Feature Flag or Setting.")
    },
    async (args: any) => {
      const data = await http.request(`/v1/settings/${encodeURIComponent(args.settingId)}`, {
        method: "PATCH",
        body: JSON.stringify(args.operations)
      });
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "delete_flag",
    "Removes a Feature Flag or Setting from a specified Config, identified by the settingId parameter.",
    {
      settingId: z
        .number()
        .int()
        .describe("The identifier of the Setting.")
    },
    async (args: any) => {
      const data = await http.request(`/v1/settings/${encodeURIComponent(args.settingId)}`, {
        method: "DELETE"
      });
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  // Tags
  server.tool(
    "list_tags",
    "Returns the list of the Tags in a specified Product, identified by the productId parameter. Tags are stored under a Product. You can add a Tag to a Feature Flag or Setting using the update_flag server tool.",
    {
      productId: z
        .string()
        .describe("The identifier of the Product.")
    },
    async (args: any) => {
      const data = await http.request(`/v1/products/${encodeURIComponent(args.productId)}/tags`);
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );


  // Feature Flags & Settings values v1
  server.tool(
    "get_value",
    "Returns the value of a Feature Flag or Setting in a specified Environment identified by the environmentId parameter. The most important attributes in the response are the value, rolloutRules and percentageRules. The value represents what the clients will get when the feature flag evaluation are not matching to any of the defined Targeting or Percentage Rules, or when there are no additional rules to evaluate. The rolloutRules and percentageRules attributes are representing the current Targeting and Percentage Rules configuration of the actual Feature Flag or Setting in an ordered collection, which means the order of the returned rules is matching to the evaluation order.",
    {},
    async () => {
      const data = await http.request("/v1/organizations");
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "replace_values",
    "Replaces the whole value of a Feature Flag or Setting in a specified Environment.",
    {
      environmentId: z
        .string()
        .describe("The identifier of the Environment."),
      settingId: z
        .string()
        .describe("The ID of the Setting."),
      reason: z
        .string()
        .describe("The reason note for the Audit Log if the Products 'Require change reason' preference is turned on.")
        .optional(),
      rolloutRules: z
        .array(z.object({}))
        .describe("Array of objects representing the Targeting Rules collection.")
        .optional(),
      rolloutPercentageItems: z
        .array(z.object({}))
        .describe("Array of objects representing the Percentage Rule collection.")
        .optional(),
      value: z
        .union([z.string(), z.number(), z.boolean()])
        .describe("The value to serve. It must respect the setting type. In some generated clients To identify typed languages you may use defaultValue properties to handle change values.")
    },
    async (args: any) => {
      const requestBody: any = {
        reason: args.reason,
        value: args.value
      };
      
      if (args.rolloutRules !== undefined) requestBody.rolloutRules = args.rolloutRules;
      if (args.rolloutPercentageItems !== undefined) requestBody.rolloutPercentageItems = args.rolloutPercentageItems;

      const data = await http.request(`/v1/environments/${encodeURIComponent(args.environmentId)}/settings/${encodeURIComponent(args.settingId)}/value`, {
        method: "PUT",
        body: JSON.stringify(requestBody)
      });
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );
}
