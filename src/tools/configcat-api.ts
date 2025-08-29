import type { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  type CallToolRequest,
  CallToolRequestSchema,
  type CallToolResult,
  ListToolsRequestSchema,
  type Tool,
  type ToolSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z, ZodError } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import type { HttpClient } from "../http";

type ToolInput = z.infer<typeof ToolSchema.shape.inputSchema>;

// Type definition for JSON objects
type JsonObject = Record<string, unknown>;

// Interface for MCP Tool Definition
interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: z.ZodType;
  method: string;
  pathTemplate: string;
  executionParameters: { name: string; in: string }[];
}

// Map of tool definitions by name
const toolDefinitionMap = new Map<string, McpToolDefinition>([
  ["list-organizations", {
    name: "list-organizations",
    description: "This endpoint returns the list of the Organizations that belongs to the user.",
    inputSchema: z.object({}),
    method: "get",
    pathTemplate: "/v1/organizations",
    executionParameters: [],
  }],
  ["list-products", {
    name: "list-products",
    description: "This endpoint returns the list of the Products that belongs to the user.",
    inputSchema: z.object({}),
    method: "get",
    pathTemplate: "/v1/products",
    executionParameters: [],
  }],
  ["list-tags", {
    name: "list-tags",
    description: `This endpoint returns the list of the Tags in a 
specified Product, identified by the \`productId\` parameter.`,
    inputSchema: z.object({
      productId: z.string().uuid().describe("The identifier of the Product."),
    }),
    method: "get",
    pathTemplate: "/v1/products/{productId}/tags",
    executionParameters: [{ "name": "productId", "in": "path" }],
  }],
  ["create-tag", {
    name: "create-tag",
    description: `This endpoint creates a new Tag in a specified Product 
identified by the \`productId\` parameter, which can be obtained from the [List Products](#operation/list-products) endpoint.`,
    inputSchema: z.object({
      productId: z.string().uuid().describe("The identifier of the Organization."),
      requestBody: z.object({
        name: z.string().min(1).max(255).describe("Name of the Tag."),
        color: z.string().max(255).nullable().optional().describe("Color of the Tag. Possible values: `panther`, `whale`, `salmon`, `lizard`, `canary`, `koala`, or any HTML color code."),
      }),
    }),
    method: "post",
    pathTemplate: "/v1/products/{productId}/tags",
    executionParameters: [{ "name": "productId", "in": "path" }],
  }],
  ["list-webhooks", {
    name: "list-webhooks",
    description: `This endpoint returns the list of the Webhooks that belongs to the given Product identified by the
\`productId\` parameter, which can be obtained from the [List Products](#operation/list-products) endpoint.`,
    inputSchema: z.object({
      productId: z.string().uuid().describe("The identifier of the Product."),
    }),
    method: "get",
    pathTemplate: "/v1/products/{productId}/webhooks",
    executionParameters: [{ "name": "productId", "in": "path" }],
  }],
  ["list-configs", {
    name: "list-configs",
    description: `This endpoint returns the list of the Configs that belongs to the given Product identified by the
\`productId\` parameter, which can be obtained from the [List Products](#operation/list-products) endpoint.`,
    inputSchema: z.object({
      productId: z.string().uuid().describe("The identifier of the Product."),
    }),
    method: "get",
    pathTemplate: "/v1/products/{productId}/configs",
    executionParameters: [{ "name": "productId", "in": "path" }],
  }],
  ["create-config", {
    name: "create-config",
    description: `This endpoint creates a new Config in a specified Product 
identified by the \`productId\` parameter, which can be obtained from the [List Products](#operation/list-products) endpoint.`,
    inputSchema: z.object({
      productId: z.string().uuid().describe("The identifier of the Product."),
      requestBody: z.object({
        name: z.string().min(1).max(255).describe("The name of the Config."),
        description: z.string().max(1000).nullable().optional().describe("The description of the Config."),
        order: z.number().int().nullable().optional().describe("The order of the Config represented on the ConfigCat Dashboard.\nDetermined from an ascending sequence of integers."),
        evaluationVersion: z.enum(["v1", "v2"]).optional().describe("Determines the evaluation version of a Config.\nUsing `v2` enables the new features of Config V2 (https://configcat.com/docs/advanced/config-v2)."),
      }),
    }),
    method: "post",
    pathTemplate: "/v1/products/{productId}/configs",
    executionParameters: [{ "name": "productId", "in": "path" }],
  }],
  ["list-environments", {
    name: "list-environments",
    description: `This endpoint returns the list of the Environments that belongs to the given Product identified by the
\`productId\` parameter, which can be obtained from the [List Products](#operation/list-products) endpoint.`,
    inputSchema: z.object({
      productId: z.string().uuid().describe("The identifier of the Product."),
    }),
    method: "get",
    pathTemplate: "/v1/products/{productId}/environments",
    executionParameters: [{ "name": "productId", "in": "path" }],
  }],
  ["create-environment", {
    name: "create-environment",
    description: `This endpoint creates a new Environment in a specified Product 
identified by the \`productId\` parameter, which can be obtained from the [List Products](#operation/list-products) endpoint.`,
    inputSchema: z.object({
      productId: z.string().uuid().describe("The identifier of the Product."),
      requestBody: z.object({
        name: z.string().min(1).max(255).describe("The name of the Environment."),
        color: z.string().max(255).nullable().optional().describe("The color of the Environment. RGB or HTML color codes are allowed."),
        description: z.string().max(1000).nullable().optional().describe("The description of the Environment."),
        order: z.number().int().nullable().optional().describe("The order of the Environment represented on the ConfigCat Dashboard.\nDetermined from an ascending sequence of integers."),
      }),
    }),
    method: "post",
    pathTemplate: "/v1/products/{productId}/environments",
    executionParameters: [{ "name": "productId", "in": "path" }],
  }],
  ["list-permission-groups", {
    name: "list-permission-groups",
    description: `This endpoint returns the list of the Permission Groups that belongs to the given Product identified by the
\`productId\` parameter, which can be obtained from the [List Products](#operation/list-products) endpoint.`,
    inputSchema: z.object({
      productId: z.string().uuid().describe("The identifier of the Product."),
    }),
    method: "get",
    pathTemplate: "/v1/products/{productId}/permissions",
    executionParameters: [{ "name": "productId", "in": "path" }],
  }],
  ["create-permission-group", {
    name: "create-permission-group",
    description: `This endpoint creates a new Permission Group in a specified Product 
identified by the \`productId\` parameter, which can be obtained from the [List Products](#operation/list-products) endpoint.`,
    inputSchema: z.object({
      productId: z.string().uuid().describe("The identifier of the Product."),
      requestBody: z.object({
        name: z.string().min(1).max(255).describe("Name of the Permission Group."),
        canManageMembers: z.boolean().optional().describe("Group members can manage team members."),
        canCreateOrUpdateConfig: z.boolean().optional().describe("Group members can create/update Configs."),
        canDeleteConfig: z.boolean().optional().describe("Group members can delete Configs."),
        canCreateOrUpdateEnvironment: z.boolean().optional().describe("Group members can create/update Environments."),
        canDeleteEnvironment: z.boolean().optional().describe("Group members can delete Environments."),
        canCreateOrUpdateSetting: z.boolean().optional().describe("Group members can create/update Feature Flags and Settings."),
        canTagSetting: z.boolean().optional().describe("Group members can attach/detach Tags to Feature Flags and Settings."),
        canDeleteSetting: z.boolean().optional().describe("Group members can delete Feature Flags and Settings."),
        canCreateOrUpdateTag: z.boolean().optional().describe("Group members can create/update Tags."),
        canDeleteTag: z.boolean().optional().describe("Group members can delete Tags."),
        canManageWebhook: z.boolean().optional().describe("Group members can create/update/delete Webhooks."),
        canUseExportImport: z.boolean().optional().describe("Group members can use the export/import feature."),
        canManageProductPreferences: z.boolean().optional().describe("Group members can update Product preferences."),
        canManageIntegrations: z.boolean().optional().describe("Group members can add and configure integrations."),
        canViewSdkKey: z.boolean().optional().describe("Group members has access to SDK keys."),
        canRotateSdkKey: z.boolean().optional().describe("Group members can rotate SDK keys."),
        canCreateOrUpdateSegments: z.boolean().optional().describe("Group members can create/update Segments."),
        canDeleteSegments: z.boolean().optional().describe("Group members can delete Segments."),
        canViewProductAuditLog: z.boolean().optional().describe("Group members has access to audit logs."),
        canViewProductStatistics: z.boolean().optional().describe("Group members has access to product statistics."),
        accessType: z.enum(["readOnly", "full", "custom"]).optional().describe("Represent the Feature Management permission."),
        newEnvironmentAccessType: z.enum(["full", "readOnly", "none"]).optional().describe("Represent the environment specific Feature Management permission."),
        environmentAccesses: z.array(z.object({
          environmentId: z.string().uuid().describe("Identifier of the Environment."),
          environmentAccessType: z.enum(["full", "readOnly", "none"]).describe("Represent the environment specific Feature Management permission."),
        })).nullable().optional().describe("List of environment specific permissions."),
        canDisable2FA: z.boolean().optional().describe("Group members can disable two-factor authentication for other members."),
      }),
    }),
    method: "post",
    pathTemplate: "/v1/products/{productId}/permissions",
    executionParameters: [{ "name": "productId", "in": "path" }],
  }],
  ["list-integrations", {
    name: "list-integrations",
    description: `This endpoint returns the list of the Integrations that belongs to the given Product identified by the
\`productId\` parameter, which can be obtained from the [List Products](#operation/list-products) endpoint.`,
    inputSchema: z.object({
      productId: z.string().uuid().describe("The identifier of the Product."),
    }),
    method: "get",
    pathTemplate: "/v1/products/{productId}/integrations",
    executionParameters: [{ "name": "productId", "in": "path" }],
  }],
  ["create-integration", {
    name: "create-integration",
    description: `This endpoint creates a new Integration in a specified Product 
identified by the \`productId\` parameter, which can be obtained from the [List Products](#operation/list-products) endpoint.

The Parameters dictionary differs for each IntegrationType:
- Datadog
  - \`apikey\`: Required. Datadog API key.
  - \`site\`: Datadog site. Available values: \`Us\`, \`Eu\`, \`Us1Fed\`, \`Us3\`, \`Us5\`. Default: \`Us\`.
- Slack  
  Connecting the Slack integration through the Public Management API will not post messages with the ConfigCat Feature Flags Slack app but with an incoming webhook.
  - \`incoming_webhook.url\`: Required. The [incoming webhook URL](https://api.slack.com/messaging/webhooks) where the integration should post messages.
- Amplitude
  - \`apiKey\`: Required. Amplitude API Key.
  - \`secretKey\`: Required. Amplitude Secret Key.
- Mixpanel
  - \`serviceAccountUserName\`: Required. Mixpanel Service Account Username.
  - \`serviceAccountSecret\`: Required. Mixpanel Service Account Secret.
  - \`projectId\`: Required. Mixpanel Project ID.
  - \`server\`: Mixpanel Server. Available values: \`StandardServer\`, \`EUResidencyServer\`. Default: \`StandardServer\`.
- Twilio Segment
  - \`writeKey\`: Required. Twilio Segment Write Key.
  - \`server\`: Twilio Segment Server. Available values: \`Us\`, \`Eu\`. Default: \`Us\`.
- PubNub (work in progress)`,
    inputSchema: z.object({
      productId: z.string().uuid().describe("The identifier of the Product."),
      requestBody: z.object({
        integrationType: z.enum(["dataDog", "slack", "amplitude", "mixPanel", "segment", "pubNub"]),
        name: z.string().min(1).describe("Name of the Integration."),
        parameters: z.record(z.string().nullable()).describe("Parameters of the Integration."),
        environmentIds: z.array(z.string().uuid()).describe("List of Environment IDs that are connected with this Integration. If the list is empty, all of the Environments are connected."),
        configIds: z.array(z.string().uuid()).describe("List of Config IDs that are connected with this Integration. If the list is empty, all of the Configs are connected."),
      }),
    }),
    method: "post",
    pathTemplate: "/v1/products/{productId}/integrations",
    executionParameters: [{ "name": "productId", "in": "path" }],
  }],
  ["list-segments", {
    name: "list-segments",
    description: `This endpoint returns the list of the Segments that belongs to the given Product identified by the
\`productId\` parameter, which can be obtained from the [List Products](#operation/list-products) endpoint.`,
    inputSchema: z.object({
      productId: z.string().uuid().describe("The identifier of the Product."),
    }),
    method: "get",
    pathTemplate: "/v1/products/{productId}/segments",
    executionParameters: [{ "name": "productId", "in": "path" }],
  }],
  ["create-segment", {
    name: "create-segment",
    description: `This endpoint creates a new Segment in a specified Product 
identified by the \`productId\` parameter, which can be obtained from the [List Products](#operation/list-products) endpoint.`,
    inputSchema: z.object({
      productId: z.string().uuid().describe("The identifier of the Product."),
      requestBody: z.object({
        name: z.string().min(1).max(255).describe("Name of the Segment."),
        description: z.string().min(0).max(1000).nullable().optional().describe("Description of the Segment."),
        comparisonAttribute: z.string().min(1).max(1000).describe("The user's attribute the evaluation process must take into account."),
        comparator: z.enum([
          "isOneOf", "isNotOneOf", "contains", "doesNotContain",
          "semVerIsOneOf", "semVerIsNotOneOf", "semVerLess", "semVerLessOrEquals",
          "semVerGreater", "semVerGreaterOrEquals", "numberEquals", "numberDoesNotEqual",
          "numberLess", "numberLessOrEquals", "numberGreater", "numberGreaterOrEquals",
          "sensitiveIsOneOf", "sensitiveIsNotOneOf",
        ]).describe("The comparison operator the evaluation process must use when it compares the given user attribute's value with the comparison value."),
        comparisonValue: z.string().min(1).describe("The value to compare with the given user attribute's value."),
      }),
    }),
    method: "post",
    pathTemplate: "/v1/products/{productId}/segments",
    executionParameters: [{ "name": "productId", "in": "path" }],
  }],
  ["list-settings", {
    name: "list-settings",
    description: `This endpoint returns the list of the Feature Flags and Settings defined in a 
specified Config, identified by the \`configId\` parameter.`,
    inputSchema: z.object({
      configId: z.string().uuid().describe("The identifier of the Config."),
    }),
    method: "get",
    pathTemplate: "/v1/configs/{configId}/settings",
    executionParameters: [{ "name": "configId", "in": "path" }],
  }],
  ["create-setting", {
    name: "create-setting",
    description: `This endpoint creates a new Feature Flag or Setting in a specified Config
identified by the \`configId\` parameter.

**Important:** The \`key\` attribute must be unique within the given Config.`,
    inputSchema: z.object({
      configId: z.string().uuid().describe("The identifier of the Config."),
      requestBody: z.object({
        hint: z.string().min(0).max(1000).nullable().describe("A short description for the setting, shown on the Dashboard UI."),
        tags: z.array(z.number().int()).nullable().describe("The IDs of the tags which are attached to the setting."),
        order: z.number().int().nullable().describe("The order of the Setting represented on the ConfigCat Dashboard. Determined from an ascending sequence of integers."),
        key: z.string().min(1).max(255).describe("The key of the Feature Flag or Setting."),
        name: z.string().min(1).max(255).describe("The name of the Feature Flag or Setting."),
        settingType: z.enum(["boolean", "string", "int", "double"]).describe("The type of the Feature Flag or Setting."),
        initialValues: z.array(z.object({
          environmentId: z.string().uuid().describe("The ID of the Environment where the initial value must be set."),
          value: z.union([z.boolean(), z.string(), z.number()]).describe("The initial value in the given Environment. It must respect the setting type. In some generated clients for strictly typed languages you may use double/float properties to handle integer values."),
        })).nullable().optional().describe("Optional, initial value of the Feature Flag or Setting in the given Environments. Only one of the SettingIdToInitFrom or the InitialValues properties can be set."),
        settingIdToInitFrom: z.number().int().nullable().optional().describe("Optional, the SettingId to initialize the values and tags of the Feature Flag or Setting from. Only can be set if you have at least ReadOnly access in all the Environments. Only one of the SettingIdToInitFrom or the InitialValues properties can be set."),
      }),
    }),
    method: "post",
    pathTemplate: "/v1/configs/{configId}/settings",
    executionParameters: [{ "name": "configId", "in": "path" }],
  }],
  ["list-auditlogs", {
    name: "list-auditlogs",
    description: `This endpoint returns the list of Audit log items for a given Product 
and the result can be optionally filtered by Config and/or Environment.

If neither \`fromUtcDateTime\` nor \`toUtcDateTime\` is set, the audit logs for the **last 7 days** will be returned.

The distance between \`fromUtcDateTime\` and \`toUtcDateTime\` cannot exceed **30 days**.`,
    inputSchema: z.object({
      productId: z.string().uuid().describe("The identifier of the Product."),
      configId: z.string().uuid().optional().describe("The identifier of the Config."),
      environmentId: z.string().uuid().optional().describe("The identifier of the Environment."),
      auditLogType: z.enum([
        "productCreated", "productChanged", "productOwnershipTransferred", "productDeleted", "productsReordered",
        "teamMemberInvited", "teamMemberInvitationRevoked", "teamMemberJoined", "teamMemberPermissionGroupChanged",
        "teamMemberRemoved", "teamMemberLeft", "teamMemberInvitationChanged", "teamMemberInvitationResent",
        "teamMemberInvitationRejected", "configCreated", "configChanged", "configDeleted", "configsReordered",
        "environmentCreated", "environmentChanged", "environmentDeleted", "environmentsReordered", "settingCreated",
        "settingChanged", "settingDeleted", "settingsReordered", "settingValueChanged", "webHookCreated",
        "webHookChanged", "webHookDeleted", "permissionGroupCreated", "permissionGroupChanged", "permissionGroupDeleted",
        "permissionGroupDefault", "apiKeyAdded", "apiKeyRemoved", "integrationAdded", "integrationChanged",
        "integrationRemoved", "apiKeyConnected", "integrationLinkAdded", "integrationLinkRemoved", "organizationAdded",
        "organizationRemoved", "organizationChanged", "organizationSubscriptionTypeChanged", "organizationAdminChanged",
        "organizationAdminLeft", "twoFactorDisabledForMember", "tagAdded", "tagChanged", "tagRemoved", "settingTagAdded",
        "settingTagRemoved", "publicApiAccessTokenAdded", "publicApiAccessTokenRemoved", "domainAdded", "domainVerified",
        "domainRemoved", "domainSamlConfigured", "domainSamlDeleted", "autoProvisioningConfigurationChanged",
        "samlIdpConfigurationAdded", "samlIdpConfigurationRemoved", "samlIdpConfigurationUpdated",
        "autoProvisioningEnabledChanged", "organizationMemberJoined", "organizationMemberProductJoinRequested",
        "organizationMemberProductJoinRequestRejected", "organizationMemberProductJoinRequestApproved",
        "organizationMemberRemoved", "codeReferencesUploaded", "codeReferenceDeleted", "codeReferenceStaleBranchDeleted",
        "segmentCreated", "segmentChanged", "segmentDeleted", "webhookSigningKeyDeleted", "webhookSigningKeyCreated",
        "userProvisioningConfigurationChanged", "syncGroupProvisioningRuleChanged", "syncGroupsReordered",
        "syncUserProvisioningEnabled", "syncUserProvisioningDisabled", "userEmailChanged", "userFullNameChanged",
        "userDisabled", "awsConnected", "awsDisconnected", "userEnabled", "syncUserDeleted", "syncGroupDeleted",
        "proxyConfigurationCreated", "proxyConfigurationChanged", "proxyConfigurationDeleted",
        "proxyConfigurationSecretRegenerated", "proxyNotificationSettingsUpdated", "proxyNotificationSettingsDeleted",
        "proxyNotificationSigningKeyAdded", "proxyNotificationSigningKeyDeleted",
      ]).nullable().optional().describe("Filter Audit logs by Audit log type."),
      fromUtcDateTime: z.string().datetime().optional().describe("Filter Audit logs by starting UTC date."),
      toUtcDateTime: z.string().datetime().optional().describe("Filter Audit logs by ending UTC date."),
    }),
    method: "get",
    pathTemplate: "/v1/products/{productId}/auditlogs",
    executionParameters: [{ "name": "productId", "in": "path" }, { "name": "configId", "in": "query" }, { "name": "environmentId", "in": "query" }, { "name": "auditLogType", "in": "query" }, { "name": "fromUtcDateTime", "in": "query" }, { "name": "toUtcDateTime", "in": "query" }],
  }],
  ["list-staleflags", {
    name: "list-staleflags",
    description: `This endpoint returns the list of Zombie (stale) flags for a given Product 
and the result can be optionally filtered by various parameters.`,
    inputSchema: z.object({
      productId: z.string().uuid().describe("The identifier of the Product."),
      scope: z.enum(["all", "watchedByMe"]).optional().describe("The scope of the report."),
      staleFlagAgeDays: z.number().int().min(7).max(90).optional().describe("The inactivity in days after a feature flag should be considered stale."),
      staleFlagStaleInEnvironmentsType: z.enum(["staleInAnyEnvironments", "staleInAllEnvironments"]).optional().describe("Consider a feature flag as stale if the feature flag is stale in all/any of the environments."),
      ignoredEnvironmentIds: z.array(z.string().uuid()).optional().describe("Ignore environment identifiers from the report."),
      ignoredTagIds: z.array(z.number().int()).optional().describe("Ignore feature flags from the report based on their tag identifiers."),
    }),
    method: "get",
    pathTemplate: "/v1/products/{productId}/staleflags",
    executionParameters: [{ "name": "productId", "in": "path" }, { "name": "scope", "in": "query" }, { "name": "staleFlagAgeDays", "in": "query" }, { "name": "staleFlagStaleInEnvironmentsType", "in": "query" }, { "name": "ignoredEnvironmentIds", "in": "query" }, { "name": "ignoredTagIds", "in": "query" }],
  }],
  ["get-code-references", {
    name: "get-code-references",
    description: "Get References for Feature Flag or Setting",
    inputSchema: z.object({
      settingId: z.number().int().describe("The identifier of the Feature Flag or Setting."),
    }),
    method: "get",
    pathTemplate: "/v1/settings/{settingId}/code-references",
    executionParameters: [{ "name": "settingId", "in": "path" }],
  }],
  ["get-config", {
    name: "get-config",
    description: `This endpoint returns the metadata of a Config
identified by the \`configId\`.`,
    inputSchema: z.object({
      configId: z.string().uuid().describe("The identifier of the Config."),
    }),
    method: "get",
    pathTemplate: "/v1/configs/{configId}",
    executionParameters: [{ "name": "configId", "in": "path" }],
  }],
  ["update-config", {
    name: "update-config",
    description: "This endpoint updates a Config identified by the `configId` parameter.",
    inputSchema: z.object({
      configId: z.string().uuid().describe("The identifier of the Config."),
      requestBody: z.object({
        name: z.string().min(0).max(255).nullable().describe("The name of the Config."),
        description: z.string().min(0).max(1000).nullable().describe("The description of the Config."),
        order: z.number().int().nullable().describe("The order of the Config represented on the ConfigCat Dashboard. Determined from an ascending sequence of integers."),
      }),
    }),
    method: "put",
    pathTemplate: "/v1/configs/{configId}",
    executionParameters: [{ "name": "configId", "in": "path" }],
  }],
  ["delete-config", {
    name: "delete-config",
    description: "This endpoint removes a Config identified by the `configId` parameter.",
    inputSchema: z.object({
      configId: z.string().uuid().describe("The identifier of the Config."),
    }),
    method: "delete",
    pathTemplate: "/v1/configs/{configId}",
    executionParameters: [{ "name": "configId", "in": "path" }],
  }],
  ["get-environment", {
    name: "get-environment",
    description: `This endpoint returns the metadata of an Environment 
identified by the \`environmentId\`.`,
    inputSchema: z.object({
      environmentId: z.string().uuid().describe("The identifier of the Environment."),
    }),
    method: "get",
    pathTemplate: "/v1/environments/{environmentId}",
    executionParameters: [{ "name": "environmentId", "in": "path" }],
  }],
  ["update-environment", {
    name: "update-environment",
    description: "This endpoint updates an Environment identified by the `environmentId` parameter.",
    inputSchema: z.object({
      environmentId: z.string().uuid().describe("The identifier of the Environment."),
      requestBody: z.object({
        name: z.string().min(0).max(255).nullable().optional().describe("The name of the Environment."),
        color: z.string().min(0).max(255).nullable().optional().describe("The color of the Environment. RGB or HTML color codes are allowed."),
        description: z.string().min(0).max(1000).nullable().optional().describe("The description of the Environment."),
        order: z.number().int().nullable().optional().describe("The order of the Environment represented on the ConfigCat Dashboard.\nDetermined from an ascending sequence of integers."),
      }).describe("The JSON request body."),
    }),
    method: "put",
    pathTemplate: "/v1/environments/{environmentId}",
    executionParameters: [{ "name": "environmentId", "in": "path" }],
  }],
  ["delete-environment", {
    name: "delete-environment",
    description: `This endpoint removes an Environment identified by the \`environmentId\` parameter.
If the \`cleanupAuditLogs\` flag is set to true, it also deletes the audit log records related to the environment
(except for the \`Created a new environment\` and \`Deleted an environment\` records).`,
    inputSchema: z.object({
      environmentId: z.string().uuid().describe("The identifier of the Environment."),
      cleanupAuditLogs: z.boolean().optional().describe("An optional flag which indicates whether the audit log records related to the environment should be deleted or not."),
    }),
    method: "delete",
    pathTemplate: "/v1/environments/{environmentId}",
    executionParameters: [{ "name": "environmentId", "in": "path" }, { "name": "cleanupAuditLogs", "in": "query" }],
  }],
  ["get-permission-group", {
    name: "get-permission-group",
    description: `This endpoint returns the metadata of a Permission Group 
identified by the \`permissionGroupId\`.`,
    inputSchema: z.object({
      permissionGroupId: z.number().int().describe("The identifier of the Permission Group."),
    }),
    method: "get",
    pathTemplate: "/v1/permissions/{permissionGroupId}",
    executionParameters: [{ "name": "permissionGroupId", "in": "path" }],
  }],
  ["update-permission-group", {
    name: "update-permission-group",
    description: "This endpoint updates a Permission Group identified by the `permissionGroupId` parameter.",
    inputSchema: z.object({
      permissionGroupId: z.number().int().describe("The identifier of the Permission Group."),
      requestBody: z.object({
        name: z.string().min(0).max(255).nullable().describe("Name of the Permission Group."),
        canManageMembers: z.boolean().nullable().describe("Group members can manage team members."),
        canCreateOrUpdateConfig: z.boolean().nullable().describe("Group members can create/update Configs."),
        canDeleteConfig: z.boolean().nullable().describe("Group members can delete Configs."),
        canCreateOrUpdateEnvironment: z.boolean().nullable().describe("Group members can create/update Environments."),
        canDeleteEnvironment: z.boolean().nullable().describe("Group members can delete Environments."),
        canCreateOrUpdateSetting: z.boolean().nullable().describe("Group members can create/update Feature Flags and Settings."),
        canTagSetting: z.boolean().nullable().describe("Group members can attach/detach Tags to Feature Flags and Settings."),
        canDeleteSetting: z.boolean().nullable().describe("Group members can delete Feature Flags and Settings."),
        canCreateOrUpdateTag: z.boolean().nullable().describe("Group members can create/update Tags."),
        canDeleteTag: z.boolean().nullable().describe("Group members can delete Tags."),
        canManageWebhook: z.boolean().nullable().describe("Group members can create/update/delete Webhooks."),
        canUseExportImport: z.boolean().nullable().describe("Group members can use the export/import feature."),
        canManageProductPreferences: z.boolean().nullable().describe("Group members can update Product preferences."),
        canManageIntegrations: z.boolean().nullable().describe("Group members can add and configure integrations."),
        canViewSdkKey: z.boolean().nullable().describe("Group members has access to SDK keys."),
        canRotateSdkKey: z.boolean().nullable().describe("Group members can rotate SDK keys."),
        canCreateOrUpdateSegments: z.boolean().nullable().describe("Group members can create/update Segments."),
        canDeleteSegments: z.boolean().nullable().describe("Group members can delete Segments."),
        canViewProductAuditLog: z.boolean().nullable().describe("Group members has access to audit logs."),
        canViewProductStatistics: z.boolean().nullable().describe("Group members has access to product statistics."),
        canDisable2FA: z.boolean().nullable().describe("Group members can disable two-factor authentication for other members."),
        accessType: z.enum(["readOnly", "full", "custom"]).nullable().describe("Represent the Feature Management permission."),
        newEnvironmentAccessType: z.enum(["full", "readOnly", "none"]).nullable().describe("Represent the environment specific Feature Management permission."),
        environmentAccesses: z.array(z.object({
          environmentId: z.string().uuid().describe("Identifier of the Environment."),
          environmentAccessType: z.enum(["full", "readOnly", "none"]).describe("Represent the environment specific Feature Management permission."),
        })).nullable().describe("List of environment specific permissions."),
      }),
    }),
    method: "put",
    pathTemplate: "/v1/permissions/{permissionGroupId}",
    executionParameters: [{ "name": "permissionGroupId", "in": "path" }],
  }],
  ["delete-permission-group", {
    name: "delete-permission-group",
    description: "This endpoint removes a Permission Group identified by the `permissionGroupId` parameter.",
    inputSchema: z.object({
      permissionGroupId: z.number().int().describe("The identifier of the Permission Group."),
    }),
    method: "delete",
    pathTemplate: "/v1/permissions/{permissionGroupId}",
    executionParameters: [{ "name": "permissionGroupId", "in": "path" }],
  }],
  ["get-integration", {
    name: "get-integration",
    description: `This endpoint returns the metadata of an Integration
identified by the \`integrationId\`.`,
    inputSchema: z.object({
      integrationId: z.string().uuid().describe("The identifier of the Integration."),
    }),
    method: "get",
    pathTemplate: "/v1/integrations/{integrationId}",
    executionParameters: [{ "name": "integrationId", "in": "path" }],
  }],
  ["update-integration", {
    name: "update-integration",
    description: `This endpoint updates a Config identified by the \`integrationId\` parameter.

The Parameters dictionary differs for each IntegrationType:
- Datadog
  - \`apikey\`: Required. Datadog API key.
  - \`site\`: Datadog site. Available values: \`Us\`, \`Eu\`, \`Us1Fed\`, \`Us3\`, \`Us5\`. Default: \`Us\`.
- Slack  
  Connecting the Slack integration through the Public Management API will not post messages with the ConfigCat Feature Flags Slack app but with an incoming webhook.
  - \`incoming_webhook.url\`: Required. The [incoming webhook URL](https://api.slack.com/messaging/webhooks) where the integration should post messages.
- Amplitude
  - \`apiKey\`: Required. Amplitude API Key.
  - \`secretKey\`: Required. Amplitude Secret Key.
- Mixpanel
  - \`serviceAccountUserName\`: Required. Mixpanel Service Account Username.
  - \`serviceAccountSecret\`: Required. Mixpanel Service Account Secret.
  - \`projectId\`: Required. Mixpanel Project ID.
  - \`server\`: Mixpanel Server. Available values: \`StandardServer\`, \`EUResidencyServer\`. Default: \`StandardServer\`.
- Twilio Segment
  - \`writeKey\`: Required. Twilio Segment Write Key.
  - \`server\`: Twilio Segment Server. Available values: \`Us\`, \`Eu\`. Default: \`Us\`.
- PubNub (work in progress)`,
    inputSchema: z.object({
      integrationId: z.string().uuid().describe("The identifier of the Integration."),
      requestBody: z.object({
        name: z.string().min(1).describe("Name of the Integration."),
        parameters: z.record(z.string().nullable()).describe("Parameters of the Integration."),
        environmentIds: z.array(z.string().uuid()).describe("List of Environment IDs that are connected with this Integration. If the list is empty, all of the Environments are connected."),
        configIds: z.array(z.string().uuid()).describe("List of Config IDs that are connected with this Integration. If the list is empty, all of the Configs are connected."),
      }),
    }),
    method: "put",
    pathTemplate: "/v1/integrations/{integrationId}",
    executionParameters: [{ "name": "integrationId", "in": "path" }],
  }],
  ["delete-integration", {
    name: "delete-integration",
    description: "This endpoint removes a Integration identified by the `integrationId` parameter.",
    inputSchema: z.object({
      integrationId: z.string().uuid().describe("The identifier of the Integration."),
    }),
    method: "delete",
    pathTemplate: "/v1/integrations/{integrationId}",
    executionParameters: [{ "name": "integrationId", "in": "path" }],
  }],
  ["get-sdk-keys", {
    name: "get-sdk-keys",
    description: "This endpoint returns the SDK Key for your Config in a specified Environment.",
    inputSchema: z.object({
      configId: z.string().uuid().describe("The identifier of the Config."),
      environmentId: z.string().uuid().describe("The identifier of the Environment."),
    }),
    method: "get",
    pathTemplate: "/v1/configs/{configId}/environments/{environmentId}",
    executionParameters: [{ "name": "configId", "in": "path" }, { "name": "environmentId", "in": "path" }],
  }],
  ["list-organization-auditlogs", {
    name: "list-organization-auditlogs",
    description: `This endpoint returns the list of Audit log items for a given Organization 
and the result can be optionally filtered by Product and/or Config and/or Environment.

If neither \`fromUtcDateTime\` nor \`toUtcDateTime\` is set, the audit logs for the **last 7 days** will be returned.

The distance between \`fromUtcDateTime\` and \`toUtcDateTime\` cannot exceed **30 days**.`,
    inputSchema: z.object({
      organizationId: z.string().uuid().describe("The identifier of the Organization."),
      productId: z.string().uuid().optional().describe("The identifier of the Product."),
      configId: z.string().uuid().optional().describe("The identifier of the Config."),
      environmentId: z.string().uuid().optional().describe("The identifier of the Environment."),
      auditLogType: z.enum([
        "productCreated", "productChanged", "productOwnershipTransferred", "productDeleted", "productsReordered",
        "teamMemberInvited", "teamMemberInvitationRevoked", "teamMemberJoined", "teamMemberPermissionGroupChanged",
        "teamMemberRemoved", "teamMemberLeft", "teamMemberInvitationChanged", "teamMemberInvitationResent",
        "teamMemberInvitationRejected", "configCreated", "configChanged", "configDeleted", "configsReordered",
        "environmentCreated", "environmentChanged", "environmentDeleted", "environmentsReordered", "settingCreated",
        "settingChanged", "settingDeleted", "settingsReordered", "settingValueChanged", "webHookCreated",
        "webHookChanged", "webHookDeleted", "permissionGroupCreated", "permissionGroupChanged", "permissionGroupDeleted",
        "permissionGroupDefault", "apiKeyAdded", "apiKeyRemoved", "integrationAdded", "integrationChanged",
        "integrationRemoved", "apiKeyConnected", "integrationLinkAdded", "integrationLinkRemoved", "organizationAdded",
        "organizationRemoved", "organizationChanged", "organizationSubscriptionTypeChanged", "organizationAdminChanged",
        "organizationAdminLeft", "twoFactorDisabledForMember", "tagAdded", "tagChanged", "tagRemoved", "settingTagAdded",
        "settingTagRemoved", "publicApiAccessTokenAdded", "publicApiAccessTokenRemoved", "domainAdded", "domainVerified",
        "domainRemoved", "domainSamlConfigured", "domainSamlDeleted", "autoProvisioningConfigurationChanged",
        "samlIdpConfigurationAdded", "samlIdpConfigurationRemoved", "samlIdpConfigurationUpdated",
        "autoProvisioningEnabledChanged", "organizationMemberJoined", "organizationMemberProductJoinRequested",
        "organizationMemberProductJoinRequestRejected", "organizationMemberProductJoinRequestApproved",
        "organizationMemberRemoved", "codeReferencesUploaded", "codeReferenceDeleted", "codeReferenceStaleBranchDeleted",
        "segmentCreated", "segmentChanged", "segmentDeleted", "webhookSigningKeyDeleted", "webhookSigningKeyCreated",
        "userProvisioningConfigurationChanged", "syncGroupProvisioningRuleChanged", "syncGroupsReordered",
        "syncUserProvisioningEnabled", "syncUserProvisioningDisabled", "userEmailChanged", "userFullNameChanged",
        "userDisabled", "awsConnected", "awsDisconnected", "userEnabled", "syncUserDeleted", "syncGroupDeleted",
        "proxyConfigurationCreated", "proxyConfigurationChanged", "proxyConfigurationDeleted",
        "proxyConfigurationSecretRegenerated", "proxyNotificationSettingsUpdated", "proxyNotificationSettingsDeleted",
        "proxyNotificationSigningKeyAdded", "proxyNotificationSigningKeyDeleted",
      ]).nullable().optional().describe("Filter Audit logs by Audit log type."),
      fromUtcDateTime: z.string().datetime().optional().describe("Filter Audit logs by starting UTC date."),
      toUtcDateTime: z.string().datetime().optional().describe("Filter Audit logs by ending UTC date."),
    }),
    method: "get",
    pathTemplate: "/v1/organizations/{organizationId}/auditlogs",
    executionParameters: [{ "name": "organizationId", "in": "path" }, { "name": "productId", "in": "query" }, { "name": "configId", "in": "query" }, { "name": "environmentId", "in": "query" }, { "name": "auditLogType", "in": "query" }, { "name": "fromUtcDateTime", "in": "query" }, { "name": "toUtcDateTime", "in": "query" }],
  }],
  ["list-organization-members", {
    name: "list-organization-members",
    description: `This endpoint returns the list of Members that belongs 
to the given Organization, identified by the \`organizationId\` parameter.

The results may vary based on the access level of the user who calls the endpoint: 
- When it's called with Organization Admin privileges, the result will contain each member in the Organization.
- When it's called without Organization Admin privileges, the result will contain each Organization Admin along with members 
  of those products where the caller has \`Team members and permission groups\` (\`canManageMembers\`) permission.`,
    inputSchema: z.object({
      organizationId: z.string().uuid().describe("The identifier of the Organization."),
    }),
    method: "get",
    pathTemplate: "/v2/organizations/{organizationId}/members",
    executionParameters: [{ "name": "organizationId", "in": "path" }],
  }],
  ["list-pending-invitations-org", {
    name: "list-pending-invitations-org",
    description: `This endpoint returns the list of pending invitations within the
given Organization identified by the \`organizationId\` parameter.`,
    inputSchema: z.object({
      organizationId: z.string().uuid().describe("The identifier of the Organization."),
    }),
    method: "get",
    pathTemplate: "/v1/organizations/{organizationId}/invitations",
    executionParameters: [{ "name": "organizationId", "in": "path" }],
  }],
  ["list-pending-invitations", {
    name: "list-pending-invitations",
    description: `This endpoint returns the list of pending invitations within the
given Product identified by the \`productId\` parameter.`,
    inputSchema: z.object({
      productId: z.string().uuid().describe("The identifier of the Product."),
    }),
    method: "get",
    pathTemplate: "/v1/products/{productId}/invitations",
    executionParameters: [{ "name": "productId", "in": "path" }],
  }],
  ["get-product", {
    name: "get-product",
    description: `This endpoint returns the metadata of a Product 
identified by the \`productId\`.`,
    inputSchema: z.object({
      productId: z.string().uuid().describe("The identifier of the Product."),
    }),
    method: "get",
    pathTemplate: "/v1/products/{productId}",
    executionParameters: [{ "name": "productId", "in": "path" }],
  }],
  ["update-product", {
    name: "update-product",
    description: "This endpoint updates a Product identified by the `productId` parameter.",
    inputSchema: z.object({
      productId: z.string().uuid().describe("The identifier of the Product."),
      requestBody: z.object({
        name: z.string().min(0).max(1000).nullable().describe("The name of the Product."),
        description: z.string().min(0).max(1000).nullable().describe("The description of the Product."),
        order: z.number().int().nullable().describe("The order of the Product represented on the ConfigCat Dashboard. Determined from an ascending sequence of integers."),
      }),
    }),
    method: "put",
    pathTemplate: "/v1/products/{productId}",
    executionParameters: [{ "name": "productId", "in": "path" }],
  }],
  ["delete-product", {
    name: "delete-product",
    description: "This endpoint removes a Product identified by the `productId` parameter.",
    inputSchema: z.object({
      productId: z.string().uuid().describe("The identifier of the Product."),
    }),
    method: "delete",
    pathTemplate: "/v1/products/{productId}",
    executionParameters: [{ "name": "productId", "in": "path" }],
  }],
  ["list-product-members", {
    name: "list-product-members",
    description: `This endpoint returns the list of Members that belongs 
to the given Product, identified by the \`productId\` parameter.`,
    inputSchema: z.object({
      productId: z.string().uuid().describe("The identifier of the Product."),
    }),
    method: "get",
    pathTemplate: "/v1/products/{productId}/members",
    executionParameters: [{ "name": "productId", "in": "path" }],
  }],
  ["get-product-preferences", {
    name: "get-product-preferences",
    description: `This endpoint returns the preferences of a Product
identified by the \`productId\`.`,
    inputSchema: z.object({
      productId: z.string().uuid().describe("The identifier of the Product."),
    }),
    method: "get",
    pathTemplate: "/v1/products/{productId}/preferences",
    executionParameters: [{ "name": "productId", "in": "path" }],
  }],
  ["update-product-preferences", {
    name: "update-product-preferences",
    description: "This endpoint updates the preferences of a Product identified by the `productId` parameter.",
    inputSchema: z.object({
      productId: z.string().uuid().describe("The identifier of the Product."),
      requestBody: z.object({
        reasonRequired: z.boolean().nullable().describe("Indicates that a mandatory note is required for saving and publishing."),
        keyGenerationMode: z.enum(["camelCase", "lowerCase", "upperCase", "pascalCase", "kebabCase"]).nullable().describe("Determines the Feature Flag key generation mode."),
        showVariationId: z.boolean().nullable().describe("Indicates whether a variation ID's must be shown on the ConfigCat Dashboard."),
        mandatorySettingHint: z.boolean().nullable().describe("Indicates whether Feature flags and Settings must have a hint."),
        reasonRequiredEnvironments: z.array(z.object({
          environmentId: z.string().uuid().describe("Identifier of the Environment."),
          reasonRequired: z.boolean().describe("Indicates that a mandatory note is required in this Environment for saving and publishing."),
        })).nullable().describe("List of Environments where mandatory note must be set before saving and publishing."),
      }),
    }),
    method: "post",
    pathTemplate: "/v1/products/{productId}/preferences",
    executionParameters: [{ "name": "productId", "in": "path" }],
  }],
  ["get-segment", {
    name: "get-segment",
    description: `This endpoint returns the metadata of a Segment
identified by the \`segmentId\`.`,
    inputSchema: z.object({
      segmentId: z.string().uuid().describe("The identifier of the Segment."),
    }),
    method: "get",
    pathTemplate: "/v1/segments/{segmentId}",
    executionParameters: [{ "name": "segmentId", "in": "path" }],
  }],
  ["update-segment", {
    name: "update-segment",
    description: "This endpoint updates a Segment identified by the `segmentId` parameter.",
    inputSchema: z.object({
      segmentId: z.string().uuid().describe("The identifier of the Segment."),
      requestBody: z.object({
        name: z.string().min(0).max(255).nullable().optional().describe("Name of the Segment."),
        description: z.string().min(0).max(1000).nullable().optional().describe("Description of the Segment."),
        comparisonAttribute: z.string().min(0).max(1000).nullable().optional().describe("The user's attribute the evaluation process must take into account."),
        comparator: z.enum([
          "isOneOf", "isNotOneOf", "contains", "doesNotContain",
          "semVerIsOneOf", "semVerIsNotOneOf", "semVerLess", "semVerLessOrEquals",
          "semVerGreater", "semVerGreaterOrEquals", "numberEquals", "numberDoesNotEqual",
          "numberLess", "numberLessOrEquals", "numberGreater", "numberGreaterOrEquals",
          "sensitiveIsOneOf", "sensitiveIsNotOneOf",
        ]).nullable().describe("The comparison operator the evaluation process must use when it compares the given user attribute's value with the comparison value."),
        comparisonValue: z.string().nullable().optional().describe("The value to compare with the given user attribute's value."),
      }),
    }),
    method: "put",
    pathTemplate: "/v1/segments/{segmentId}",
    executionParameters: [{ "name": "segmentId", "in": "path" }],
  }],
  ["delete-segment", {
    name: "delete-segment",
    description: "This endpoint removes a Segment identified by the `segmentId` parameter.",
    inputSchema: z.object({
      segmentId: z.string().uuid().describe("The identifier of the Segment."),
    }),
    method: "delete",
    pathTemplate: "/v1/segments/{segmentId}",
    executionParameters: [{ "name": "segmentId", "in": "path" }],
  }],
  ["get-setting", {
    name: "get-setting",
    description: `This endpoint returns the metadata attributes of a Feature Flag or Setting 
identified by the \`settingId\` parameter.`,
    inputSchema: z.object({
      settingId: z.number().int().describe("The identifier of the Setting."),
    }),
    method: "get",
    pathTemplate: "/v1/settings/{settingId}",
    executionParameters: [{ "name": "settingId", "in": "path" }],
  }],
  ["replace-setting", {
    name: "replace-setting",
    description: `This endpoint replaces the whole value of a Feature Flag or Setting
identified by the \`settingId\` parameter.

**Important:** As this endpoint is doing a complete replace, it's important to set every other attribute that you don't 
want to change in its original state. Not listing one means it will reset.`,
    inputSchema: z.object({
      settingId: z.number().int().describe("The identifier of the Setting."),
      requestBody: z.object({
        hint: z.string().min(0).max(1000).nullable().describe("A short description for the setting, shown on the Dashboard UI."),
        tags: z.array(z.number().int()).nullable().describe("The IDs of the tags which are attached to the setting."),
        order: z.number().int().nullable().describe("The order of the Setting represented on the ConfigCat Dashboard. Determined from an ascending sequence of integers."),
        name: z.string().min(1).max(255).nullable().describe("The name of the Feature Flag or Setting."),
      }),
    }),
    method: "put",
    pathTemplate: "/v1/settings/{settingId}",
    executionParameters: [{ "name": "settingId", "in": "path" }],
  }],
  ["delete-setting", {
    name: "delete-setting",
    description: `This endpoint removes a Feature Flag or Setting from a specified Config, 
identified by the \`configId\` parameter.`,
    inputSchema: z.object({
      settingId: z.number().int().describe("The identifier of the Setting."),
    }),
    method: "delete",
    pathTemplate: "/v1/settings/{settingId}",
    executionParameters: [{ "name": "settingId", "in": "path" }],
  }],
  ["update-setting", {
    name: "update-setting",
    description: `This endpoint updates the metadata of a Feature Flag or Setting 
with a collection of [JSON Patch](https://jsonpatch.com) operations in a specified Config.

Only the \`name\`, \`hint\` and \`tags\` attributes are modifiable by this endpoint.
The \`tags\` attribute is a simple collection of the [tag IDs](#operation/list-tags) attached to the given setting.

The advantage of using JSON Patch is that you can describe individual update operations on a resource
without touching attributes that you don't want to change.

For example: We have the following resource.
\`\`\`json
{
  "settingId": 5345,
  "key": "myGrandFeature",
  "name": "Tihs is a naem with soem typos.",
  "hint": "This flag controls my grandioso feature.",
  "settingType": "boolean",
  "tags": [
    {
      "tagId": 0, 
      "name": "sample tag", 
      "color": "whale"
    }
  ]
}
\`\`\`
If we send an update request body as below (it changes the \`name\` and adds the already existing tag with the id \`2\`):
\`\`\`json
[
  {
    "op": "replace", 
    "path": "/name", 
    "value": "This is the name without typos."
  }, 
  {
    "op": "add", 
    "path": "/tags/-", 
    "value": 2
  }
]
\`\`\`
Only the \`name\` and \`tags\` are updated and all the other attributes remain unchanged.
So we get a response like this:
\`\`\`json
{
  "settingId": 5345, 
  "key": "myGrandFeature", 
  "name": "This is the name without typos.", 
  "hint": "This flag controls my grandioso feature.", 
  "settingType": "boolean", 
  "tags": [
    {
      "tagId": 0, 
      "name": "sample tag", 
      "color": "whale"
    }, 
    {
      "tagId": 2, 
      "name": "another tag", 
      "color": "koala"
    }
  ]
}
\`\`\``,
    inputSchema: z.object({
      settingId: z.number().int().describe("The identifier of the Setting."),
      requestBody: z.array(z.object({
        op: z.enum(["unknown", "add", "remove", "replace", "move", "copy", "test"]).describe("The operation type."),
        path: z.string().min(1).describe("The source path."),
        from: z.string().nullable().describe("The target path."),
        value: z.any().describe("The discrete value."),
      })),
    }),
    method: "patch",
    pathTemplate: "/v1/settings/{settingId}",
    executionParameters: [{ "name": "settingId", "in": "path" }],
  }],
  ["list-settings-by-tag", {
    name: "list-settings-by-tag",
    description: `This endpoint returns the list of the Settings that 
has the specified Tag, identified by the \`tagId\` parameter.`,
    inputSchema: z.object({
      tagId: z.number().int().describe("The identifier of the Tag."),
    }),
    method: "get",
    pathTemplate: "/v1/tags/{tagId}/settings",
    executionParameters: [{ "name": "tagId", "in": "path" }],
  }],
  ["get-setting-value-by-sdkkey", {
    name: "get-setting-value-by-sdkkey",
    description: `This endpoint returns the value of a Feature Flag or Setting 
in a specified Environment identified by the <a target="_blank" rel="noopener noreferrer" href="https://app.configcat.com/sdkkey">SDK key</a> passed in the \`X-CONFIGCAT-SDKKEY\` header.

The most important attributes in the response are the \`value\`, \`rolloutRules\` and \`percentageRules\`.
The \`value\` represents what the clients will get when the evaluation requests of our SDKs 
are not matching to any of the defined Targeting or Percentage Rules, or when there are no additional rules to evaluate.

The \`rolloutRules\` and \`percentageRules\` attributes are representing the current 
Targeting and Percentage Rules configuration of the actual Feature Flag or Setting 
in an **ordered** collection, which means the order of the returned rules is matching to the
evaluation order. You can read more about these rules [here](https://configcat.com/docs/targeting/targeting-overview/).`,
    inputSchema: z.object({
      "settingKeyOrId": z.string().describe("The key or id of the Setting."),
      "X-CONFIGCAT-SDKKEY": z.string().describe("The ConfigCat SDK Key. (https://app.configcat.com/sdkkey)"),
    }),
    method: "get",
    pathTemplate: "/v1/settings/{settingKeyOrId}/value",
    executionParameters: [{ "name": "settingKeyOrId", "in": "path" }, { "name": "X-CONFIGCAT-SDKKEY", "in": "header" }],
  }],
  ["replace-setting-value-by-sdkkey", {
    name: "replace-setting-value-by-sdkkey",
    description: `This endpoint replaces the value of a Feature Flag or Setting 
in a specified Environment identified by the <a target="_blank" rel="noopener noreferrer" href="https://app.configcat.com/sdkkey">SDK key</a> passed in the \`X-CONFIGCAT-SDKKEY\` header.

Only the \`value\`, \`rolloutRules\` and \`percentageRules\` attributes are modifiable by this endpoint.

**Important:** As this endpoint is doing a complete replace, it's important to set every other attribute that you don't 
want to change to its original state. Not listing one means it will reset.

For example: We have the following resource.
\`\`\`json
{
  "rolloutPercentageItems": [
    {
      "percentage": 30,
      "value": true
    },
    {
      "percentage": 70,
      "value": false
    }
  ],
  "rolloutRules": [],
  "value": false
}
\`\`\`
If we send a replace request body as below:
\`\`\`json
{
  "value": true
}
\`\`\`
Then besides that the default served value is set to \`true\`, all the Percentage Rules are deleted. 
So we get a response like this:
\`\`\`json
{
  "rolloutPercentageItems": [],
  "rolloutRules": [],
  "value": true
}
\`\`\``,
    inputSchema: z.object({
      "settingKeyOrId": z.string().describe("The key or id of the Setting."),
      "reason": z.string().optional().describe("The reason note for the Audit Log if the Product's \"Config changes require a reason\" preference is turned on."),
      "X-CONFIGCAT-SDKKEY": z.string().describe("The ConfigCat SDK Key. (https://app.configcat.com/sdkkey)"),
      "requestBody": z.object({
        rolloutRules: z.array(z.object({
          comparisonAttribute: z.string().min(0).max(1000).nullable().describe("The user attribute to compare."),
          comparator: z.enum([
            "isOneOf", "isNotOneOf", "contains", "doesNotContain",
            "semVerIsOneOf", "semVerIsNotOneOf", "semVerLess", "semVerLessOrEquals",
            "semVerGreater", "semVerGreaterOrEquals", "numberEquals", "numberDoesNotEqual",
            "numberLess", "numberLessOrEquals", "numberGreater", "numberGreaterOrEquals",
            "sensitiveIsOneOf", "sensitiveIsNotOneOf",
          ]).nullable().describe("The comparison operator the evaluation process must use when it compares the given user attribute's value with the comparison value."),
          comparisonValue: z.string().nullable().describe("The value to compare against."),
          value: z.union([z.boolean(), z.string(), z.number()]).describe("The value to serve when the comparison matches. It must respect the setting type. In some generated clients for strictly typed languages you may use double/float properties to handle integer values."),
          segmentComparator: z.enum(["isIn", "isNotIn"]).nullable().describe("The segment comparison operator used during the evaluation process."),
          segmentId: z.string().uuid().nullable().describe("The segment to compare against."),
        })).describe("The targeting rule collection."),
        rolloutPercentageItems: z.array(z.object({
          percentage: z.number().int().describe("The percentage value for the rule."),
          value: z.union([z.boolean(), z.string(), z.number()]).describe("The value to serve when the user falls in the percentage rule. It must respect the setting type. In some generated clients for strictly typed languages you may use double/float properties to handle integer values."),
        })).describe("The percentage rule collection."),
        value: z.union([z.boolean(), z.string(), z.number()]).describe("The value to serve. It must respect the setting type. In some generated clients for strictly typed languages you may use double/float properties to handle integer values."),
      }),
    }),
    method: "put",
    pathTemplate: "/v1/settings/{settingKeyOrId}/value",
    executionParameters: [{ "name": "settingKeyOrId", "in": "path" }, { "name": "reason", "in": "query" }, { "name": "X-CONFIGCAT-SDKKEY", "in": "header" }],
  }],
  ["update-setting-value-by-sdkkey", {
    name: "update-setting-value-by-sdkkey",
    description: `This endpoint updates the value of a Feature Flag or Setting 
with a collection of [JSON Patch](https://jsonpatch.com) operations in a specified Environment
identified by the <a target="_blank" rel="noopener noreferrer" href="https://app.configcat.com/sdkkey">SDK key</a> passed in the \`X-CONFIGCAT-SDKKEY\` header.

Only the \`value\`, \`rolloutRules\` and \`percentageRules\` attributes are modifiable by this endpoint.

The advantage of using JSON Patch is that you can describe individual update operations on a resource
without touching attributes that you don't want to change. It supports collection reordering, so it also 
can be used for reordering the targeting rules of a Feature Flag or Setting.

For example: We have the following resource.
\`\`\`json
{
  "rolloutPercentageItems": [
    {
      "percentage": 30,
      "value": true
    },
    {
      "percentage": 70,
      "value": false
    }
  ],
  "rolloutRules": [],
  "value": false
}
\`\`\`
If we send an update request body as below:
\`\`\`json
[
  {
    "op": "replace",
    "path": "/value",
    "value": true
  }
]
\`\`\`
Only the default served value is going to be set to \`true\` and all the Percentage Rules are remaining unchanged.
So we get a response like this:
\`\`\`json
{
  "rolloutPercentageItems": [
    {
      "percentage": 30,
      "value": true
    },
    {
      "percentage": 70,
      "value": false
    }
  ],
  "rolloutRules": [],
  "value": true
}
\`\`\``,
    inputSchema: z.object({
      "settingKeyOrId": z.string().describe("The key or id of the Setting."),
      "reason": z.string().optional().describe("The reason note for the Audit Log if the Product's \"Config changes require a reason\" preference is turned on."),
      "X-CONFIGCAT-SDKKEY": z.string().describe("The ConfigCat SDK Key. (https://app.configcat.com/sdkkey)"),
      "requestBody": z.array(z.object({
        op: z.enum(["unknown", "add", "remove", "replace", "move", "copy", "test"]).describe("The operation type."),
        path: z.string().min(1).describe("The source path."),
        from: z.string().nullable().describe("The target path."),
        value: z.any().describe("The discrete value."),
      })),
    }),
    method: "patch",
    pathTemplate: "/v1/settings/{settingKeyOrId}/value",
    executionParameters: [{ "name": "settingKeyOrId", "in": "path" }, { "name": "reason", "in": "query" }, { "name": "X-CONFIGCAT-SDKKEY", "in": "header" }],
  }],
  ["get-setting-value", {
    name: "get-setting-value",
    description: `This endpoint returns the value of a Feature Flag or Setting 
in a specified Environment identified by the \`environmentId\` parameter.

The most important attributes in the response are the \`value\`, \`rolloutRules\` and \`percentageRules\`.
The \`value\` represents what the clients will get when the evaluation requests of our SDKs 
are not matching to any of the defined Targeting or Percentage Rules, or when there are no additional rules to evaluate.

The \`rolloutRules\` and \`percentageRules\` attributes are representing the current 
Targeting and Percentage Rules configuration of the actual Feature Flag or Setting 
in an **ordered** collection, which means the order of the returned rules is matching to the
evaluation order. You can read more about these rules [here](https://configcat.com/docs/targeting/targeting-overview).`,
    inputSchema: z.object({
      environmentId: z.string().uuid().describe("The identifier of the Environment."),
      settingId: z.number().int().describe("The id of the Setting."),
    }),
    method: "get",
    pathTemplate: "/v1/environments/{environmentId}/settings/{settingId}/value",
    executionParameters: [{ "name": "environmentId", "in": "path" }, { "name": "settingId", "in": "path" }],
  }],
  ["replace-setting-value", {
    name: "replace-setting-value",
    description: `This endpoint replaces the whole value of a Feature Flag or Setting in a specified Environment.

Only the \`value\`, \`rolloutRules\` and \`percentageRules\` attributes are modifiable by this endpoint.

**Important:** As this endpoint is doing a complete replace, it's important to set every other attribute that you don't 
want to change in its original state. Not listing one means it will reset.

For example: We have the following resource.
\`\`\`json
{
  "rolloutPercentageItems": [
    {
      "percentage": 30,
      "value": true
    },
    {
      "percentage": 70,
      "value": false
    }
  ],
  "rolloutRules": [],
  "value": false
}
\`\`\`
If we send a replace request body as below:
\`\`\`json
{
  "value": true
}
\`\`\`
Then besides that the default value is set to \`true\`, all the Percentage Rules are deleted. 
So we get a response like this:
\`\`\`json
{
  "rolloutPercentageItems": [],
  "rolloutRules": [],
  "value": true
}
\`\`\`

The \`rolloutRules\` property describes two types of rules:

- **Targeting rules**: When you want to add or update a targeting rule, the \`comparator\`, \`comparisonAttribute\`, and \`comparisonValue\` members are required.
- **Segment rules**: When you want to add add or update a segment rule, the \`segmentId\` which identifies the desired segment and the \`segmentComparator\` members are required.`,
    inputSchema: z.object({
      environmentId: z.string().uuid().describe("The identifier of the Environment."),
      settingId: z.number().int().describe("The id of the Setting."),
      reason: z.string().optional().describe("The reason note for the Audit Log if the Product's \"Config changes require a reason\" preference is turned on."),
      requestBody: z.object({
        rolloutRules: z.array(z.object({
          comparisonAttribute: z.string().min(0).max(1000).nullable().describe("The user attribute to compare."),
          comparator: z.enum([
            "isOneOf", "isNotOneOf", "contains", "doesNotContain",
            "semVerIsOneOf", "semVerIsNotOneOf", "semVerLess", "semVerLessOrEquals",
            "semVerGreater", "semVerGreaterOrEquals", "numberEquals", "numberDoesNotEqual",
            "numberLess", "numberLessOrEquals", "numberGreater", "numberGreaterOrEquals",
            "sensitiveIsOneOf", "sensitiveIsNotOneOf",
          ]).nullable().describe("The comparison operator the evaluation process must use when it compares the given user attribute's value with the comparison value."),
          comparisonValue: z.string().nullable().describe("The value to compare against."),
          value: z.union([z.boolean(), z.string(), z.number()]).describe("The value to serve when the comparison matches. It must respect the setting type. In some generated clients for strictly typed languages you may use double/float properties to handle integer values."),
          segmentComparator: z.enum(["isIn", "isNotIn"]).nullable().describe("The segment comparison operator used during the evaluation process."),
          segmentId: z.string().uuid().nullable().describe("The segment to compare against."),
        })).describe("The targeting rule collection."),
        rolloutPercentageItems: z.array(z.object({
          percentage: z.number().int().describe("The percentage value for the rule."),
          value: z.union([z.boolean(), z.string(), z.number()]).describe("The value to serve when the user falls in the percentage rule. It must respect the setting type. In some generated clients for strictly typed languages you may use double/float properties to handle integer values."),
        })).describe("The percentage rule collection."),
        value: z.union([z.boolean(), z.string(), z.number()]).describe("The value to serve. It must respect the setting type. In some generated clients for strictly typed languages you may use double/float properties to handle integer values."),
      }),
    }),
    method: "put",
    pathTemplate: "/v1/environments/{environmentId}/settings/{settingId}/value",
    executionParameters: [{ "name": "environmentId", "in": "path" }, { "name": "settingId", "in": "path" }, { "name": "reason", "in": "query" }],
  }],
  ["update-setting-value", {
    name: "update-setting-value",
    description: `This endpoint updates the value of a Feature Flag or Setting 
with a collection of [JSON Patch](https://jsonpatch.com) operations in a specified Environment.

Only the \`value\`, \`rolloutRules\` and \`percentageRules\` attributes are modifiable by this endpoint.

The advantage of using JSON Patch is that you can describe individual update operations on a resource
without touching attributes that you don't want to change. It supports collection reordering, so it also 
can be used for reordering the targeting rules of a Feature Flag or Setting.

For example: We have the following resource.
\`\`\`json
{
  "rolloutPercentageItems": [
    {
      "percentage": 30,
      "value": true
    },
    {
      "percentage": 70,
      "value": false
    }
  ],
  "rolloutRules": [],
  "value": false
}
\`\`\`
If we send an update request body as below:
\`\`\`json
[
  {
    "op": "replace",
    "path": "/value",
    "value": true
  }
]
\`\`\`
Only the default value is going to be set to \`true\` and all the Percentage Rules are remaining unchanged.
So we get a response like this:
\`\`\`json
{
  "rolloutPercentageItems": [
    {
      "percentage": 30,
      "value": true
    },
    {
      "percentage": 70,
      "value": false
    }
  ],
  "rolloutRules": [],
  "value": true
}
\`\`\`

The \`rolloutRules\` property describes two types of rules:

- **Targeting rules**: When you want to add or update a targeting rule, the \`comparator\`, \`comparisonAttribute\`, and \`comparisonValue\` members are required.
- **Segment rules**: When you want to add add or update a segment rule, the \`segmentId\` which identifies the desired segment and the \`segmentComparator\` members are required.`,
    inputSchema: z.object({
      environmentId: z.string().uuid().describe("The identifier of the Environment."),
      settingId: z.number().int().describe("The identifier of the Setting."),
      reason: z.string().optional().describe("The reason note for the Audit Log if the Product's \"Config changes require a reason\" preference is turned on."),
      requestBody: z.array(z.object({
        op: z.enum(["unknown", "add", "remove", "replace", "move", "copy", "test"]).describe("The operation type."),
        path: z.string().min(1).describe("The source path."),
        from: z.string().nullable().optional().describe("The target path."),
        value: z.any().optional().describe("The discrete value."),
      })),
    }),
    method: "patch",
    pathTemplate: "/v1/environments/{environmentId}/settings/{settingId}/value",
    executionParameters: [{ "name": "environmentId", "in": "path" }, { "name": "settingId", "in": "path" }, { "name": "reason", "in": "query" }],
  }],
  ["get-setting-value-by-sdkkey-v2", {
    name: "get-setting-value-by-sdkkey-v2",
    description: `This endpoint returns the value of a Feature Flag or Setting
in a specified Environment identified by the <a target="_blank" rel="noopener noreferrer" href="https://app.configcat.com/sdkkey">SDK key</a> passed in the \`X-CONFIGCAT-SDKKEY\` header.

The most important fields in the response are the \`defaultValue\`, \`targetingRules\`.
The \`defaultValue\` represents what the clients will get when the evaluation requests of our SDKs
are not matching to any of the defined Targeting Rules, or when there are no additional rules to evaluate.

The \`targetingRules\` represents the current
Targeting Rule configuration of the actual Feature Flag or Setting
in an **ordered** collection, which means the order of the returned rules is matching to the
evaluation order. You can read more about these rules [here](https://configcat.com/docs/targeting/targeting-overview/).

The \`percentageEvaluationAttribute\` represents the custom [User Object](https://configcat.com/docs/targeting/user-object/) attribute that must be used at the [percentage evaluation](https://configcat.com/docs/advanced/targeting/#anatomy-of-the-percentage-based-targeting) of the Feature Flag or Setting.`,
    inputSchema: z.object({
      "settingKeyOrId": z.string().describe("The key or id of the Setting."),
      "X-CONFIGCAT-SDKKEY": z.string().describe("The ConfigCat SDK Key. (https://app.configcat.com/sdkkey)"),
    }),
    method: "get",
    pathTemplate: "/v2/settings/{settingKeyOrId}/value",
    executionParameters: [{ "name": "settingKeyOrId", "in": "path" }, { "name": "X-CONFIGCAT-SDKKEY", "in": "header" }],
  }],
  ["replace-setting-value-by-sdkkey-v2", {
    name: "replace-setting-value-by-sdkkey-v2",
    description: `This endpoint replaces the value and the Targeting Rules of a Feature Flag or Setting
in a specified Environment identified by the <a target="_blank" rel="noopener noreferrer" href="https://app.configcat.com/sdkkey">SDK key</a> passed in the \`X-CONFIGCAT-SDKKEY\` header.

Only the \`defaultValue\`, \`targetingRules\`, and \`percentageEvaluationAttribute\` fields are modifiable by this endpoint.

**Important:** As this endpoint is doing a complete replace, it's important to set every other field that you don't
want to change to its original state. Not listing one means it will reset.

For example: We have the following resource of a Feature Flag.
\`\`\`json
{
  "defaultValue": {
    "boolValue": false
  },
  "targetingRules": [
    {
      "conditions": [
        {
          "userCondition": {
            "comparisonAttribute": "Email",
            "comparator": "sensitiveTextEquals",
            "comparisonValue": {
              "stringValue": "test@example.com"
            }
          }
        }
      ],
      "percentageOptions": [],
      "value": {
        "boolValue": true
      }
    }
  ]
}
\`\`\`
If we send a replace request body as below:
\`\`\`json
{
  "defaultValue": {
    "boolValue": true
  }
}
\`\`\`
Then besides that the default served value is set to \`true\`, all the Targeting Rules are deleted.
So we get a response like this:
\`\`\`json
{
  "defaultValue": {
    "boolValue": true
  },
  "targetingRules": []
}
\`\`\``,
    inputSchema: z.object({
      "settingKeyOrId": z.string().describe("The key or id of the Setting."),
      "reason": z.string().optional().describe("The reason note for the Audit Log if the Product's \"Config changes require a reason\" preference is turned on."),
      "X-CONFIGCAT-SDKKEY": z.string().describe("The ConfigCat SDK Key. (https://app.configcat.com/sdkkey)"),
      "requestBody": z.object({
        defaultValue: z.object({
          boolValue: z.boolean().nullable().optional().describe("The served value in case of a boolean Feature Flag."),
          stringValue: z.string().nullable().optional().describe("The served value in case of a text Setting."),
          intValue: z.number().int().nullable().optional().describe("The served value in case of a whole number Setting."),
          doubleValue: z.number().nullable().optional().describe("The served value in case of a decimal number Setting."),
        }).describe("Represents the value of a Feature Flag or Setting."),
        targetingRules: z.array(z.object({
          conditions: z.array(z.object({
            userCondition: z.object({
              comparisonAttribute: z.string().min(1).max(1000).describe("The User Object attribute that the condition is based on. Can be \"User ID\", \"Email\", \"Country\" or any custom attribute."),
              comparator: z.enum(["isOneOf", "isNotOneOf", "containsAnyOf", "doesNotContainAnyOf", "semVerIsOneOf", "semVerIsNotOneOf", "semVerLess", "semVerLessOrEquals", "semVerGreater", "semVerGreaterOrEquals", "numberEquals", "numberDoesNotEqual", "numberLess", "numberLessOrEquals", "numberGreater", "numberGreaterOrEquals", "sensitiveIsOneOf", "sensitiveIsNotOneOf", "dateTimeBefore", "dateTimeAfter", "sensitiveTextEquals", "sensitiveTextDoesNotEqual", "sensitiveTextStartsWithAnyOf", "sensitiveTextNotStartsWithAnyOf", "sensitiveTextEndsWithAnyOf", "sensitiveTextNotEndsWithAnyOf", "sensitiveArrayContainsAnyOf", "sensitiveArrayDoesNotContainAnyOf", "textEquals", "textDoesNotEqual", "textStartsWithAnyOf", "textNotStartsWithAnyOf", "textEndsWithAnyOf", "textNotEndsWithAnyOf", "arrayContainsAnyOf", "arrayDoesNotContainAnyOf"]).describe("The comparison operator which defines the relation between the comparison attribute and the comparison value."),
              comparisonValue: z.object({
                stringValue: z.string().nullable().optional().describe("The string representation of the comparison value."),
                doubleValue: z.number().nullable().optional().describe("The number representation of the comparison value."),
                listValue: z.array(z.object({
                  value: z.string().describe("The actual comparison value."),
                  hint: z.string().min(0).max(1500).nullable().optional().describe("An optional hint for the comparison value."),
                })).nullable().optional().describe("The list representation of the comparison value."),
              }).describe("The value that the user object's attribute is compared to."),
            }).nullable().optional().describe("Describes a condition that is based on user attributes."),
            segmentCondition: z.object({
              segmentId: z.string().uuid().describe("The segment's identifier."),
              comparator: z.enum(["isIn", "isNotIn"]).describe("The segment comparison operator used during the evaluation process."),
            }).nullable().optional().describe("Describes a condition that is based on a segment."),
            prerequisiteFlagCondition: z.object({
              prerequisiteSettingId: z.number().int().describe("The prerequisite flag's identifier."),
              comparator: z.enum(["equals", "doesNotEqual"]).describe("Prerequisite flag comparison operator used during the evaluation process."),
              prerequisiteComparisonValue: z.object({
                boolValue: z.boolean().nullable().optional().describe("The served value in case of a boolean Feature Flag."),
                stringValue: z.string().nullable().optional().describe("The served value in case of a text Setting."),
                intValue: z.number().int().nullable().optional().describe("The served value in case of a whole number Setting."),
                doubleValue: z.number().nullable().optional().describe("The served value in case of a decimal number Setting."),
              }).describe("Represents the value of a Feature Flag or Setting."),
            }).nullable().optional().describe("Describes a condition that is based on a prerequisite flag."),
          })).nullable().optional().describe("The list of conditions that are combined with logical AND operators. It can be one of the following: User condition, Segment condition, Prerequisite flag condition"),
          percentageOptions: z.array(z.object({
            percentage: z.number().int().describe("A number between 0 and 100 that represents a randomly allocated fraction of the users."),
            value: z.object({
              boolValue: z.boolean().nullable().optional().describe("The served value in case of a boolean Feature Flag."),
              stringValue: z.string().nullable().optional().describe("The served value in case of a text Setting."),
              intValue: z.number().int().nullable().optional().describe("The served value in case of a whole number Setting."),
              doubleValue: z.number().nullable().optional().describe("The served value in case of a decimal number Setting."),
            }).describe("Represents the value of a Feature Flag or Setting."),
          })).nullable().optional().describe("The percentage options from where the evaluation process will choose a value based on the flag's percentage evaluation attribute."),
          value: z.object({
            boolValue: z.boolean().nullable().optional().describe("The served value in case of a boolean Feature Flag."),
            stringValue: z.string().nullable().optional().describe("The served value in case of a text Setting."),
            intValue: z.number().int().nullable().optional().describe("The served value in case of a whole number Setting."),
            doubleValue: z.number().nullable().optional().describe("The served value in case of a decimal number Setting."),
          }).nullable().optional().describe("Represents the value of a Feature Flag or Setting."),
        })).nullable().optional().describe("The targeting rules of the Feature Flag or Setting."),
        percentageEvaluationAttribute: z.string().max(1000).nullable().optional().describe("The user attribute used for percentage evaluation. If not set, it defaults to the `Identifier` user object attribute."),
      }),
    }),
    method: "put",
    pathTemplate: "/v2/settings/{settingKeyOrId}/value",
    executionParameters: [{ "name": "settingKeyOrId", "in": "path" }, { "name": "reason", "in": "query" }, { "name": "X-CONFIGCAT-SDKKEY", "in": "header" }],
  }],
  ["update-setting-value-by-sdkkey-v2", {
    name: "update-setting-value-by-sdkkey-v2",
    description: `This endpoint updates the value of a Feature Flag or Setting
with a collection of [JSON Patch](https://jsonpatch.com) operations in a specified Environment.

Only the \`defaultValue\`, \`targetingRules\`, and \`percentageEvaluationAttribute\` fields are modifiable by this endpoint.

The advantage of using JSON Patch is that you can describe individual update operations on a resource
without touching attributes that you don't want to change. It supports collection reordering, so it also
can be used for reordering the targeting rules of a Feature Flag or Setting.

For example: We have the following resource of a Feature Flag.
\`\`\`json
{
  "defaultValue": {
    "boolValue": false
  },
  "targetingRules": [
    {
      "conditions": [
        {
          "userCondition": {
            "comparisonAttribute": "Email",
            "comparator": "sensitiveTextEquals",
            "comparisonValue": {
              "stringValue": "test@example.com"
            }
          }
        }
      ],
      "percentageOptions": [],
      "value": {
        "boolValue": true
      }
    }
  ]
}
\`\`\`
If we send an update request body as below:
\`\`\`json
[
  {
    "op": "replace",
    "path": "/targetingRules/0/value/boolValue",
    "value": true
  }
]
\`\`\`
Only the first Targeting Rule's \`value\` is going to be set to \`false\` and all the other fields are remaining unchanged.

So we get a response like this:
\`\`\`json
{
  "defaultValue": {
    "boolValue": false
  },
  "targetingRules": [
    {
      "conditions": [
        {
          "userCondition": {
            "comparisonAttribute": "Email",
            "comparator": "sensitiveTextEquals",
            "comparisonValue": {
              "stringValue": "test@example.com"
            }
          }
        }
      ],
      "percentageOptions": [],
      "value": {
        "boolValue": false
      }
    }
  ]
}
\`\`\``,
    inputSchema: z.object({
      "settingKeyOrId": z.string().describe("The key or id of the Setting."),
      "reason": z.string().optional().describe("The reason note for the Audit Log if the Product's \"Config changes require a reason\" preference is turned on."),
      "X-CONFIGCAT-SDKKEY": z.string().describe("The ConfigCat SDK Key. (https://app.configcat.com/sdkkey)"),
      "requestBody": z.array(z.object({
        op: z.enum(["unknown", "add", "remove", "replace", "move", "copy", "test"]).describe("The operation type."),
        path: z.string().min(1).describe("The source path."),
        from: z.string().nullable().optional().describe("The target path."),
        value: z.any().optional().describe("The discrete value."),
      })),
    }),
    method: "patch",
    pathTemplate: "/v2/settings/{settingKeyOrId}/value",
    executionParameters: [{ "name": "settingKeyOrId", "in": "path" }, { "name": "reason", "in": "query" }, { "name": "X-CONFIGCAT-SDKKEY", "in": "header" }],
  }],
  ["get-setting-value-v2", {
    name: "get-setting-value-v2",
    description: `This endpoint returns the value of a Feature Flag or Setting
in a specified Environment identified by the \`environmentId\` parameter.

The most important fields in the response are the \`defaultValue\`, \`targetingRules\`, and \`percentageEvaluationAttribute\`.
The \`defaultValue\` represents what the clients will get when the evaluation requests of our SDKs
are not matching to any of the defined Targeting Rules, or when there are no additional rules to evaluate.

The \`targetingRules\` represents the current
Targeting Rule configuration of the actual Feature Flag or Setting
in an **ordered** collection, which means the order of the returned rules is matching to the
evaluation order. You can read more about these rules [here](https://configcat.com/docs/targeting/targeting-overview/).

The \`percentageEvaluationAttribute\` represents the custom [User Object](https://configcat.com/docs/targeting/user-object/) attribute that must be used for [percentage evaluation](https://configcat.com/docs/targeting/percentage-options/) of the Feature Flag or Setting.`,
    inputSchema: z.object({
      environmentId: z.string().uuid().describe("The identifier of the Environment."),
      settingId: z.number().int().describe("The id of the Setting."),
    }),
    method: "get",
    pathTemplate: "/v2/environments/{environmentId}/settings/{settingId}/value",
    executionParameters: [{ "name": "environmentId", "in": "path" }, { "name": "settingId", "in": "path" }],
  }],
  ["replace-setting-value-v2", {
    name: "replace-setting-value-v2",
    description: `This endpoint replaces the value and the Targeting Rules of a Feature Flag or Setting
in a specified Environment identified by the <a target="_blank" rel="noopener noreferrer" href="https://app.configcat.com/sdkkey">SDK key</a> passed in the \`X-CONFIGCAT-SDKKEY\` header.

Only the \`defaultValue\`, \`targetingRules\`, and \`percentageEvaluationAttribute\` fields are modifiable by this endpoint.

**Important:** As this endpoint is doing a complete replace, it's important to set every other field that you don't
want to change to its original state. Not listing one means it will reset.

For example: We have the following resource of a Feature Flag.
\`\`\`json
{
  "defaultValue": {
    "boolValue": false
  },
  "targetingRules": [
    {
      "conditions": [
        {
          "userCondition": {
            "comparisonAttribute": "Email",
            "comparator": "sensitiveTextEquals",
            "comparisonValue": {
              "stringValue": "test@example.com"
            }
          }
        }
      ],
      "percentageOptions": [],
      "value": {
        "boolValue": true
      }
    }
  ]
}
\`\`\`
If we send a replace request body as below:
\`\`\`json
{
  "defaultValue": {
    "boolValue": true
  }
}
\`\`\`
Then besides that the default served value is set to \`true\`, all the Targeting Rules are deleted.
So we get a response like this:
\`\`\`json
{
  "defaultValue": {
    "boolValue": true
  },
  "targetingRules": []
}
\`\`\``,
    inputSchema: z.object({
      environmentId: z.string().uuid().describe("The identifier of the Environment."),
      settingId: z.number().int().describe("The identifier of the Setting."),
      reason: z.string().optional().describe("The reason note for the Audit Log if the Product's \"Config changes require a reason\" preference is turned on."),
      requestBody: z.object({
        defaultValue: z.object({
          boolValue: z.boolean().nullable().optional().describe("The served value in case of a boolean Feature Flag."),
          stringValue: z.string().nullable().optional().describe("The served value in case of a text Setting."),
          intValue: z.number().int().nullable().optional().describe("The served value in case of a whole number Setting."),
          doubleValue: z.number().nullable().optional().describe("The served value in case of a decimal number Setting."),
        }).describe("Represents the value of a Feature Flag or Setting."),
        targetingRules: z.array(z.object({
          conditions: z.array(z.object({
            userCondition: z.object({
              comparisonAttribute: z.string().min(1).max(1000).describe("The User Object attribute that the condition is based on. Can be \"User ID\", \"Email\", \"Country\" or any custom attribute."),
              comparator: z.enum(["isOneOf", "isNotOneOf", "containsAnyOf", "doesNotContainAnyOf", "semVerIsOneOf", "semVerIsNotOneOf", "semVerLess", "semVerLessOrEquals", "semVerGreater", "semVerGreaterOrEquals", "numberEquals", "numberDoesNotEqual", "numberLess", "numberLessOrEquals", "numberGreater", "numberGreaterOrEquals", "sensitiveIsOneOf", "sensitiveIsNotOneOf", "dateTimeBefore", "dateTimeAfter", "sensitiveTextEquals", "sensitiveTextDoesNotEqual", "sensitiveTextStartsWithAnyOf", "sensitiveTextNotStartsWithAnyOf", "sensitiveTextEndsWithAnyOf", "sensitiveTextNotEndsWithAnyOf", "sensitiveArrayContainsAnyOf", "sensitiveArrayDoesNotContainAnyOf", "textEquals", "textDoesNotEqual", "textStartsWithAnyOf", "textNotStartsWithAnyOf", "textEndsWithAnyOf", "textNotEndsWithAnyOf", "arrayContainsAnyOf", "arrayDoesNotContainAnyOf"]).describe("The comparison operator which defines the relation between the comparison attribute and the comparison value."),
              comparisonValue: z.object({
                stringValue: z.string().nullable().optional().describe("The string representation of the comparison value."),
                doubleValue: z.number().nullable().optional().describe("The number representation of the comparison value."),
                listValue: z.array(z.object({
                  value: z.string().describe("The actual comparison value."),
                  hint: z.string().min(0).max(1500).nullable().optional().describe("An optional hint for the comparison value."),
                })).nullable().optional().describe("The list representation of the comparison value."),
              }).describe("The value that the user object's attribute is compared to."),
            }).nullable().optional().describe("Describes a condition that is based on user attributes."),
            segmentCondition: z.object({
              segmentId: z.string().uuid().describe("The segment's identifier."),
              comparator: z.enum(["isIn", "isNotIn"]).describe("The segment comparison operator used during the evaluation process."),
            }).nullable().optional().describe("Describes a condition that is based on a segment."),
            prerequisiteFlagCondition: z.object({
              prerequisiteSettingId: z.number().int().describe("The prerequisite flag's identifier."),
              comparator: z.enum(["equals", "doesNotEqual"]).describe("Prerequisite flag comparison operator used during the evaluation process."),
              prerequisiteComparisonValue: z.object({
                boolValue: z.boolean().nullable().optional().describe("The served value in case of a boolean Feature Flag."),
                stringValue: z.string().nullable().optional().describe("The served value in case of a text Setting."),
                intValue: z.number().int().nullable().optional().describe("The served value in case of a whole number Setting."),
                doubleValue: z.number().nullable().optional().describe("The served value in case of a decimal number Setting."),
              }).describe("Represents the value of a Feature Flag or Setting."),
            }).nullable().optional().describe("Describes a condition that is based on a prerequisite flag."),
          })).nullable().optional().describe("The list of conditions that are combined with logical AND operators. It can be one of the following: User condition, Segment condition, Prerequisite flag condition"),
          percentageOptions: z.array(z.object({
            percentage: z.number().int().describe("A number between 0 and 100 that represents a randomly allocated fraction of the users."),
            value: z.object({
              boolValue: z.boolean().nullable().optional().describe("The served value in case of a boolean Feature Flag."),
              stringValue: z.string().nullable().optional().describe("The served value in case of a text Setting."),
              intValue: z.number().int().nullable().optional().describe("The served value in case of a whole number Setting."),
              doubleValue: z.number().nullable().optional().describe("The served value in case of a decimal number Setting."),
            }).describe("Represents the value of a Feature Flag or Setting."),
          })).nullable().optional().describe("The percentage options from where the evaluation process will choose a value based on the flag's percentage evaluation attribute."),
          value: z.object({
            boolValue: z.boolean().nullable().optional().describe("The served value in case of a boolean Feature Flag."),
            stringValue: z.string().nullable().optional().describe("The served value in case of a text Setting."),
            intValue: z.number().int().nullable().optional().describe("The served value in case of a whole number Setting."),
            doubleValue: z.number().nullable().optional().describe("The served value in case of a decimal number Setting."),
          }).nullable().optional().describe("Represents the value of a Feature Flag or Setting."),
        })).nullable().optional().describe("The targeting rules of the Feature Flag or Setting."),
        percentageEvaluationAttribute: z.string().max(1000).nullable().optional().describe("The user attribute used for percentage evaluation. If not set, it defaults to the `Identifier` user object attribute."),
      }),
    }),
    method: "put",
    pathTemplate: "/v2/environments/{environmentId}/settings/{settingId}/value",
    executionParameters: [{ "name": "environmentId", "in": "path" }, { "name": "settingId", "in": "path" }, { "name": "reason", "in": "query" }],
  }],
  ["update-setting-value-v2", {
    name: "update-setting-value-v2",
    description: `This endpoint updates the value of a Feature Flag or Setting
with a collection of [JSON Patch](https://jsonpatch.com) operations in a specified Environment.

Only the \`defaultValue\`, \`targetingRules\`, and \`percentageEvaluationAttribute\` fields are modifiable by this endpoint.

The advantage of using JSON Patch is that you can describe individual update operations on a resource
without touching attributes that you don't want to change. It supports collection reordering, so it also
can be used for reordering the targeting rules of a Feature Flag or Setting.

For example: We have the following resource of a Feature Flag.
\`\`\`json
{
  "defaultValue": {
    "boolValue": false
  },
  "targetingRules": [
    {
      "conditions": [
        {
          "userCondition": {
            "comparisonAttribute": "Email",
            "comparator": "sensitiveTextEquals",
            "comparisonValue": {
              "stringValue": "test@example.com"
            }
          }
        }
      ],
      "percentageOptions": [],
      "value": {
        "boolValue": true
      }
    }
  ]
}
\`\`\`
If we send an update request body as below:
\`\`\`json
[
  {
    "op": "replace",
    "path": "/targetingRules/0/value/boolValue",
    "value": true
  }
]
\`\`\`
Only the first Targeting Rule's \`value\` is going to be set to \`false\` and all the other fields are remaining unchanged.

So we get a response like this:
\`\`\`json
{
  "defaultValue": {
    "boolValue": false
  },
  "targetingRules": [
    {
      "conditions": [
        {
          "userCondition": {
            "comparisonAttribute": "Email",
            "comparator": "sensitiveTextEquals",
            "comparisonValue": {
              "stringValue": "test@example.com"
            }
          }
        }
      ],
      "percentageOptions": [],
      "value": {
        "boolValue": false
      }
    }
  ]
}
\`\`\``,
    inputSchema: z.object({
      environmentId: z.string().uuid().describe("The identifier of the Environment."),
      settingId: z.number().int().describe("The identifier of the Setting."),
      reason: z.string().optional().describe("The reason note for the Audit Log if the Product's \"Config changes require a reason\" preference is turned on."),
      requestBody: z.array(z.object({
        op: z.enum(["unknown", "add", "remove", "replace", "move", "copy", "test"]).describe("The operation type."),
        path: z.string().min(1).describe("The source path."),
        from: z.string().nullable().optional().describe("The target path."),
        value: z.any().optional().describe("The discrete value."),
      })),
    }),
    method: "patch",
    pathTemplate: "/v2/environments/{environmentId}/settings/{settingId}/value",
    executionParameters: [{ "name": "environmentId", "in": "path" }, { "name": "settingId", "in": "path" }, { "name": "reason", "in": "query" }],
  }],
  ["get-setting-values", {
    name: "get-setting-values",
    description: `This endpoint returns the value of a specified Config's Feature Flags or Settings identified by the \`configId\` parameter
in a specified Environment identified by the \`environmentId\` parameter.

The most important attributes in the response are the \`value\`, \`rolloutRules\` and \`percentageRules\`.
The \`value\` represents what the clients will get when the evaluation requests of our SDKs 
are not matching to any of the defined Targeting or Percentage Rules, or when there are no additional rules to evaluate.

The \`rolloutRules\` and \`percentageRules\` attributes are representing the current 
Targeting and Percentage Rules configuration of the actual Feature Flag or Setting 
in an **ordered** collection, which means the order of the returned rules is matching to the
evaluation order. You can read more about these rules [here](https://configcat.com/docs/targeting/targeting-overview/).`,
    inputSchema: z.object({
      configId: z.string().uuid().describe("The identifier of the Config."),
      environmentId: z.string().uuid().describe("The identifier of the Environment."),
    }),
    method: "get",
    pathTemplate: "/v1/configs/{configId}/environments/{environmentId}/values",
    executionParameters: [{ "name": "configId", "in": "path" }, { "name": "environmentId", "in": "path" }],
  }],
  ["post-setting-values", {
    name: "post-setting-values",
    description: `This endpoint replaces the values of a specified Config's Feature Flags or Settings identified by the \`configId\` parameter
in a specified Environment identified by the \`environmentId\` parameter.

Only the \`value\`, \`rolloutRules\` and \`percentageRules\` attributes are modifiable by this endpoint.

**Important:** As this endpoint is doing a complete replace, it's important to set every other attribute that you don't 
want to change in its original state. Not listing one means it will reset.

For example: We have the following resource.
\`\`\`json
{
  "settingValues": [
    {
      "rolloutPercentageItems": [
        {
          "percentage": 30,
          "value": true
        },
        {
          "percentage": 70,
          "value": false
        }
      ],
      "rolloutRules": [],
      "value": false,
      "settingId": 1
    }
  ]
}
\`\`\`
If we send a replace request body as below:
\`\`\`json
{ 
  "settingValues": [
    {
      "value": true,
      "settingId": 1
    }
  ]
}
\`\`\`
Then besides that the default value is set to \`true\`, all the Percentage Rules are deleted. 
So we get a response like this:
\`\`\`json
{
  "settingValues": [
    {
      "rolloutPercentageItems": [],
      "rolloutRules": [],
      "value": true,
      "setting": 
      {
        "settingId": 1
      }
    }
  ]
}
\`\`\`

The \`rolloutRules\` property describes two types of rules:

- **Targeting rules**: When you want to add or update a targeting rule, the \`comparator\`, \`comparisonAttribute\`, and \`comparisonValue\` members are required.
- **Segment rules**: When you want to add add or update a segment rule, the \`segmentId\` which identifies the desired segment and the \`segmentComparator\` members are required.`,
    inputSchema: z.object({
      configId: z.string().uuid().describe("The identifier of the Config."),
      environmentId: z.string().uuid().describe("The identifier of the Environment."),
      reason: z.string().optional().describe("The reason note for the Audit Log if the Product's \"Config changes require a reason\" preference is turned on."),
      requestBody: z.object({
        settingValues: z.array(z.object({
          rolloutRules: z.array(z.object({
            comparisonAttribute: z.string().min(0).max(1000).nullable().optional().describe("The user attribute to compare."),
            comparator: z.enum(["isOneOf", "isNotOneOf", "contains", "doesNotContain", "semVerIsOneOf", "semVerIsNotOneOf", "semVerLess", "semVerLessOrEquals", "semVerGreater", "semVerGreaterOrEquals", "numberEquals", "numberDoesNotEqual", "numberLess", "numberLessOrEquals", "numberGreater", "numberGreaterOrEquals", "sensitiveIsOneOf", "sensitiveIsNotOneOf"]).nullable().optional().describe("The comparison operator the evaluation process must use when it compares the given user attribute's value with the comparison value."),
            comparisonValue: z.string().nullable().optional().describe("The value to compare against."),
            value: z.union([z.boolean(), z.string(), z.number()]).describe("The value to serve when the comparison matches. It must respect the setting type. In some generated clients for strictly typed languages you may use double/float properties to handle integer values."),
            segmentComparator: z.enum(["isIn", "isNotIn"]).nullable().optional().describe("The segment comparison operator used during the evaluation process."),
            segmentId: z.string().uuid().nullable().optional().describe("The segment to compare against."),
          })).optional().describe("The targeting rule collection."),
          rolloutPercentageItems: z.array(z.object({
            percentage: z.number().int().describe("The percentage value for the rule."),
            value: z.union([z.boolean(), z.string(), z.number()]).describe("The value to serve when the user falls in the percentage rule. It must respect the setting type. In some generated clients for strictly typed languages you may use double/float properties to handle integer values."),
          })).optional().describe("The percentage rule collection."),
          value: z.union([z.boolean(), z.string(), z.number()]).describe("The value to serve. It must respect the setting type. In some generated clients for strictly typed languages you may use double/float properties to handle integer values."),
          settingId: z.number().int().optional().describe("The identifier of the Setting."),
        })).describe("The values to update."),
      }),
    }),
    method: "post",
    pathTemplate: "/v1/configs/{configId}/environments/{environmentId}/values",
    executionParameters: [{ "name": "configId", "in": "path" }, { "name": "environmentId", "in": "path" }, { "name": "reason", "in": "query" }],
  }],
  ["get-setting-values-v2", {
    name: "get-setting-values-v2",
    description: `This endpoint returns all Feature Flag and Setting values of a Config identified by the \`configId\` parameter
in a specified Environment identified by the \`environmentId\` parameter.

The most important fields in the response are the \`defaultValue\`, \`targetingRules\`.
The \`defaultValue\` represents what the clients will get when the evaluation requests of our SDKs
are not matching to any of the defined Targeting Rules, or when there are no additional rules to evaluate.

The \`targetingRules\` represents the current
Targeting Rule configuration of the actual Feature Flag or Setting
in an **ordered** collection, which means the order of the returned rules is matching to the
evaluation order. You can read more about these rules [here](https://configcat.com/docs/targeting/targeting-overview/).

The \`percentageEvaluationAttribute\` represents the custom [User Object](https://configcat.com/docs/targeting/user-object/) attribute that must be used for [percentage evaluation](https://configcat.com/docs/targeting/percentage-options/) of the Feature Flag or Setting.`,
    inputSchema: z.object({
      configId: z.string().uuid().describe("The identifier of the Config."),
      environmentId: z.string().uuid().describe("The identifier of the Environment."),
    }),
    method: "get",
    pathTemplate: "/v2/configs/{configId}/environments/{environmentId}/values",
    executionParameters: [{ "name": "configId", "in": "path" }, { "name": "environmentId", "in": "path" }],
  }],
  ["post-setting-values-v2", {
    name: "post-setting-values-v2",
    description: `This endpoint batch updates the Feature Flags and Settings of a Config identified by the \`configId\` parameter
in a specified Environment identified by the \`environmentId\` parameter.

Only those Feature Flags and Settings are updated which are part of the request, all the others are left untouched.

**Important:** As this endpoint is doing a complete replace on those Feature Flags and Settings, which are set in the request. 
It's important to set every other field that you don't want to change in its original state. Not listing a field means that it will reset.

For example: We have the following resource of a Feature Flag.
\`\`\`json
{
  "settingFormulas": [
    {
      "defaultValue": {
        "boolValue": false
      },
      "targetingRules": [
        {
          "conditions": [
            {
              "userCondition": {
                "comparisonAttribute": "Email",
                "comparator": "sensitiveTextEquals",
                "comparisonValue": {
                  "stringValue": "test@example.com"
                }
              }
            }
          ],
          "percentageOptions": [],
          "value": {
            "boolValue": true
          }
        }
      ],
      "settingId": 1
    }
  ]
}
\`\`\`
If we send a batch replace request body as below:
\`\`\`json
{ 
  "updateFormulas": [
    {
      "defaultValue": {
        "boolValue": false
      },
      "settingId": 1
    }
  ]
}
\`\`\`
Then besides that the default value is set to \`true\`, all Targeting Rules of the related Feature Flag are deleted.
So we get a response like this:
\`\`\`json
{
  "settingFormulas": [
    {
      "defaultValue": {
        "boolValue": false
      },
      "targetingRules": [],
      "setting": 
      {
        "settingId": 1
      }
    }
  ]
}
\`\`\``,
    inputSchema: z.object({
      configId: z.string().uuid(),
      environmentId: z.string().uuid(),
      reason: z.string().optional(),
      requestBody: z.object({
        updateFormulas: z.array(z.object({
          defaultValue: z.object({
            boolValue: z.boolean().nullable().optional().describe("The served value in case of a boolean Feature Flag."),
            stringValue: z.string().nullable().optional().describe("The served value in case of a text Setting."),
            intValue: z.number().int().nullable().optional().describe("The served value in case of a whole number Setting."),
            doubleValue: z.number().nullable().optional().describe("The served value in case of a decimal number Setting."),
          }).describe("Represents the value of a Feature Flag or Setting."),
          targetingRules: z.array(z.object({
            conditions: z.array(z.object({
              userCondition: z.object({
                comparisonAttribute: z.string().min(1).max(1000).describe("The User Object attribute that the condition is based on. Can be \"User ID\", \"Email\", \"Country\" or any custom attribute."),
                comparator: z.enum(["isOneOf", "isNotOneOf", "containsAnyOf", "doesNotContainAnyOf", "semVerIsOneOf", "semVerIsNotOneOf", "semVerLess", "semVerLessOrEquals", "semVerGreater", "semVerGreaterOrEquals", "numberEquals", "numberDoesNotEqual", "numberLess", "numberLessOrEquals", "numberGreater", "numberGreaterOrEquals", "sensitiveIsOneOf", "sensitiveIsNotOneOf", "dateTimeBefore", "dateTimeAfter", "sensitiveTextEquals", "sensitiveTextDoesNotEqual", "sensitiveTextStartsWithAnyOf", "sensitiveTextNotStartsWithAnyOf", "sensitiveTextEndsWithAnyOf", "sensitiveTextNotEndsWithAnyOf", "sensitiveArrayContainsAnyOf", "sensitiveArrayDoesNotContainAnyOf", "textEquals", "textDoesNotEqual", "textStartsWithAnyOf", "textNotStartsWithAnyOf", "textEndsWithAnyOf", "textNotEndsWithAnyOf", "arrayContainsAnyOf", "arrayDoesNotContainAnyOf"]).describe("The comparison operator which defines the relation between the comparison attribute and the comparison value."),
                comparisonValue: z.object({
                  stringValue: z.string().nullable().optional().describe("The string representation of the comparison value."),
                  doubleValue: z.number().nullable().optional().describe("The number representation of the comparison value."),
                  listValue: z.array(z.object({
                    value: z.string().describe("The actual comparison value."),
                    hint: z.string().min(0).max(1500).nullable().optional().describe("An optional hint for the comparison value."),
                  })).nullable().optional().describe("The list representation of the comparison value."),
                }).describe("The value that the user object's attribute is compared to."),
              }).nullable().optional().describe("Describes a condition that is based on user attributes."),
              segmentCondition: z.object({
                segmentId: z.string().uuid().describe("The segment's identifier."),
                comparator: z.enum(["isIn", "isNotIn"]).describe("The segment comparison operator used during the evaluation process."),
              }).nullable().optional().describe("Describes a condition that is based on a segment."),
              prerequisiteFlagCondition: z.object({
                prerequisiteSettingId: z.number().int().describe("the prerequisite flag's identifier"),
                comparator: z.enum(["equals", "doesNotEqual"]).describe("Prerequisite flag comparison operator used during the evaluation process."),
                prerequisiteComparisonValue: z.object({
                  boolValue: z.boolean().nullable().optional().describe("The served value in case of a boolean Feature Flag."),
                  stringValue: z.string().nullable().optional().describe("The served value in case of a text Setting."),
                  intValue: z.number().int().nullable().optional().describe("The served value in case of a whole number Setting."),
                  doubleValue: z.number().nullable().optional().describe("The served value in case of a decimal number Setting."),
                }).describe("Represents the value of a Feature Flag or Setting."),
              }).nullable().optional(),
            })).nullable().optional(),
            percentageOptions: z.array(z.object({
              percentage: z.number().int().describe("A number between 0 and 100 that represents a randomly allocated fraction of the users."),
              value: z.object({
                boolValue: z.boolean().nullable().optional().describe("The served value in case of a boolean Feature Flag."),
                stringValue: z.string().nullable().optional().describe("The served value in case of a text Setting."),
                intValue: z.number().int().nullable().optional().describe("The served value in case of a whole number Setting."),
                doubleValue: z.number().nullable().optional().describe("The served value in case of a decimal number Setting."),
              }).describe("Represents the value of a Feature Flag or Setting."),
            })).nullable().optional().describe("The percentage options from where the evaluation process will choose a value based on the flag's percentage evaluation attribute."),
            value: z.object({
              boolValue: z.boolean().nullable().optional().describe("The served value in case of a boolean Feature Flag."),
              stringValue: z.string().nullable().optional().describe("The served value in case of a text Setting."),
              intValue: z.number().int().nullable().optional().describe("The served value in case of a whole number Setting."),
              doubleValue: z.number().nullable().optional().describe("The served value in case of a decimal number Setting."),
            }).nullable().optional().describe("Represents the value of a Feature Flag or Setting."),
          })).nullable().optional().describe("The targeting rules of the Feature Flag or Setting."),
          percentageEvaluationAttribute: z.string().max(1000).nullable().optional().describe("The user attribute used for percentage evaluation. If not set, it defaults to the `Identifier` user object attribute."),
          settingId: z.number().int().describe("The identifier of the feature flag or setting."),
        })).describe("Evaluation descriptors of each updated Feature Flag and Setting."),
      }),
    }),
    method: "post",
    pathTemplate: "/v2/configs/{configId}/environments/{environmentId}/values",
    executionParameters: [{ "name": "configId", "in": "path" }, { "name": "environmentId", "in": "path" }, { "name": "reason", "in": "query" }],
  }],
  ["get-tag", {
    name: "get-tag",
    description: `This endpoint returns the metadata of a Tag 
identified by the \`tagId\`.`,
    inputSchema: z.object({
      tagId: z.number().int().describe("The identifier of the Tag."),
    }),
    method: "get",
    pathTemplate: "/v1/tags/{tagId}",
    executionParameters: [{ "name": "tagId", "in": "path" }],
  }],
  ["update-tag", {
    name: "update-tag",
    description: "This endpoint updates a Tag identified by the `tagId` parameter.",
    inputSchema: z.object({
      tagId: z.number().int(),
      requestBody: z.object({
        name: z.string().min(0).max(255).nullable().optional().describe("The name of the Tag."),
        color: z.string().min(0).max(255).nullable().optional().describe("Color of the Tag. Possible values: `panther`, `whale`, `salmon`, `lizard`, `canary`, `koala`, or any HTML color code."),
      }),
    }),
    method: "put",
    pathTemplate: "/v1/tags/{tagId}",
    executionParameters: [{ "name": "tagId", "in": "path" }],
  }],
  ["delete-tag", {
    name: "delete-tag",
    description: "This endpoint deletes a Tag identified by the `tagId` parameter. To remove a Tag from a Feature Flag or Setting use the [Update Flag](#operation/update-setting) endpoint.",
    inputSchema: z.object({
      tagId: z.number().int().describe("The identifier of the Tag."),
    }),
    method: "delete",
    pathTemplate: "/v1/tags/{tagId}",
    executionParameters: [{ "name": "tagId", "in": "path" }],
  }],
  ["get-webhook", {
    name: "get-webhook",
    description: `This endpoint returns the metadata of a Webhook 
identified by the \`webhookId\`.`,
    inputSchema: z.object({
      webhookId: z.number().int().describe("The identifier of the Webhook."),
    }),
    method: "get",
    pathTemplate: "/v1/webhooks/{webhookId}",
    executionParameters: [{ "name": "webhookId", "in": "path" }],
  }],
  ["replace-webhook", {
    name: "replace-webhook",
    description: `This endpoint replaces the whole value of a Webhook identified by the \`webhookId\` parameter.

**Important:** As this endpoint is doing a complete replace, it's important to set every other attribute that you don't
want to change in its original state. Not listing one means it will reset.`,
    inputSchema: z.object({
      webhookId: z.number().int().describe("The identifier of the Webhook."),
      requestBody: z.object({
        url: z.string().min(7).max(1000).describe("The URL of the Webhook."),
        content: z.string().min(0).max(15000).nullable().optional().describe("The HTTP body content."),
        httpMethod: z.enum(["get", "post"]).nullable().optional(),
        webHookHeaders: z.array(z.object({
          key: z.string().min(1).max(255),
          value: z.string().min(1).max(1000),
          isSecure: z.boolean().optional().describe("Indicates whether the header value is sensitive."),
        })).nullable().optional().describe("List of HTTP headers."),
      }),
    }),
    method: "put",
    pathTemplate: "/v1/webhooks/{webhookId}",
    executionParameters: [{ "name": "webhookId", "in": "path" }],
  }],
  ["delete-webhook", {
    name: "delete-webhook",
    description: "This endpoint removes a Webhook identified by the `webhookId` parameter.",
    inputSchema: z.object({
      webhookId: z.number().int().describe("The identifier of the Webhook."),
    }),
    method: "delete",
    pathTemplate: "/v1/webhooks/{webhookId}",
    executionParameters: [{ "name": "webhookId", "in": "path" }],
  }],
  ["update-webhook", {
    name: "update-webhook",
    description: `This endpoint updates a Webhook identified by the \`webhookId\` parameter with a collection of [JSON Patch](https://jsonpatch.com) operations.

The advantage of using JSON Patch is that you can describe individual update operations on a resource without touching attributes that you don't want to change.

For example: We have the following resource.
\`\`\`json
{
  "webhookId": 6,
  "url": "https://example.com/hook",
  "httpMethod": "post",
  "content": "null",
  "webHookHeaders": []
}
\`\`\`
If we send an update request body as below (it changes the \`content\` field and adds a new HTTP header):
\`\`\`json
[
  {
    "op": "replace", 
    "path": "/content", 
    "value": "Some webhook content."
  }, 
  {
    "op": "add", 
    "path": "/webHookHeaders/-", 
    "value": {
      "key": "X-Custom-Header", 
      "value": "Custom header value"
    }
  }
]
\`\`\`
Only the \`content\` and \`webHookHeaders\` are updated and all the other attributes remain unchanged.
So we get a response like this:
\`\`\`json
{
  "webhookId": 6,
  "url": "https://example.com/hook",
  "httpMethod": "post", 
  "content": "Some webhook content.", 
  "webHookHeaders": [
    {
      "key": "X-Custom-Header", 
      "value": "Custom header value", 
      "isSecure": false
    }
  ]
}
\`\`\``,
    inputSchema: z.object({
      webhookId: z.number().int().describe("The identifier of the Webhook."),
      requestBody: z.array(z.object({
        op: z.enum(["unknown", "add", "remove", "replace", "move", "copy", "test"]).describe("The operation type."),
        path: z.string().min(1).describe("The source path."),
        from: z.string().nullable().optional().describe("The target path."),
        value: z.any().optional().describe("The discrete value."),
      })),
    }),
    method: "patch",
    pathTemplate: "/v1/webhooks/{webhookId}",
    executionParameters: [{ "name": "webhookId", "in": "path" }],
  }],
  ["get-webhook-signing-keys", {
    name: "get-webhook-signing-keys",
    description: `This endpoint returns the signing keys of a Webhook 
identified by the \`webhookId\`.

Signing keys are used for ensuring the Webhook requests you receive are actually sent by ConfigCat.

<a href="https://configcat.com/docs/advanced/notifications-webhooks/#verifying-webhook-requests" target="_blank" rel="noopener noreferrer">Here</a> you can read more about Webhook request verification.`,
    inputSchema: z.object({
      webhookId: z.number().int().describe("The identifier of the Webhook."),
    }),
    method: "get",
    pathTemplate: "/v1/webhooks/{webhookId}/keys",
    executionParameters: [{ "name": "webhookId", "in": "path" }],
  }],
  ["create-product", {
    name: "create-product",
    description: `This endpoint creates a new Product in a specified Organization 
identified by the \`organizationId\` parameter, which can be obtained from the [List Organizations](#operation/list-organizations) endpoint.`,
    inputSchema: z.object({
      organizationId: z.string().uuid().describe("The identifier of the Organization."),
      requestBody: z.object({
        name: z.string().min(1).max(1000).describe("The name of the Product."),
        description: z.string().min(0).max(1000).nullable().optional().describe("The description of the Product."),
        order: z.number().int().nullable().optional().describe("The order of the Product represented on the ConfigCat Dashboard. Determined from an ascending sequence of integers."),
      }),
    }),
    method: "post",
    pathTemplate: "/v1/organizations/{organizationId}/products",
    executionParameters: [{ "name": "organizationId", "in": "path" }],
  }],
  ["create-webhook", {
    name: "create-webhook",
    description: `This endpoint creates a new Webhook in a specified Product
identified by the \`productId\` parameter, which can be obtained from the [List Products](#operation/list-products) endpoint.`,
    inputSchema: z.object({
      configId: z.string().uuid().describe("The identifier of the Config."),
      environmentId: z.string().uuid().describe("The identifier of the Environment."),
      requestBody: z.object({
        url: z.string().min(7).max(1000).describe("The URL of the Webhook."),
        content: z.string().min(0).max(15000).nullable().optional().describe("The HTTP body content."),
        httpMethod: z.enum(["get", "post"]).nullable().optional(),
        webHookHeaders: z.array(z.object({
          key: z.string().min(1).max(255),
          value: z.string().min(1).max(1000),
          isSecure: z.boolean().optional().describe("Indicates whether the header value is sensitive."),
        })).nullable().optional().describe("List of HTTP headers."),
      }),
    }),
    method: "post",
    pathTemplate: "/v1/configs/{configId}/environments/{environmentId}/webhooks",
    executionParameters: [{ "name": "configId", "in": "path" }, { "name": "environmentId", "in": "path" }],
  }],
  ["invite-member", {
    name: "invite-member",
    description: "This endpoint invites a Member into the given Product identified by the `productId` parameter.",
    inputSchema: z.object({
      productId: z.string().uuid().describe("The identifier of the Product."),
      requestBody: z.object({
        emails: z.array(z.string()).describe("List of email addresses to invite."),
        permissionGroupId: z.number().int().describe("Identifier of the Permission Group to where the invited users should be added."),
      }),
    }),
    method: "post",
    pathTemplate: "/v1/products/{productId}/members/invite",
    executionParameters: [{ "name": "productId", "in": "path" }],
  }],
  ["update-member-permissions", {
    name: "update-member-permissions",
    description: `This endpoint updates the permissions of a Member identified by the \`userId\`. 
This endpoint can also be used to move a Member between Permission Groups within a Product.
Only a single Permission Group can be set per Product.`,
    inputSchema: z.object({
      organizationId: z.string().uuid().describe("The identifier of the Organization."),
      userId: z.string().describe("The identifier of the Member."),
      requestBody: z.object({
        permissionGroupIds: z.array(z.number().int()).nullable().optional().describe("List of Permission Group identifiers to where the Member should be added."),
        isAdmin: z.boolean().nullable().optional().describe("Indicates that the member must be Organization Admin."),
        isBillingManager: z.boolean().nullable().optional().describe("Indicates that the member must be Billing Manager."),
        removeFromPermissionGroupsWhereIdNotSet: z.boolean().optional().describe("When `true`, the member will be removed from those Permission Groups that are not listed in the `permissionGroupIds` field."),
      }),
    }),
    method: "post",
    pathTemplate: "/v1/organizations/{organizationId}/members/{userId}",
    executionParameters: [{ "name": "organizationId", "in": "path" }, { "name": "userId", "in": "path" }],
  }],
  ["delete-organization-member", {
    name: "delete-organization-member",
    description: `This endpoint removes a Member identified by the \`userId\` from the 
given Organization identified by the \`organizationId\` parameter.`,
    inputSchema: z.object({
      organizationId: z.string().uuid().describe("The identifier of the Organization."),
      userId: z.string().describe("The identifier of the Member."),
    }),
    method: "delete",
    pathTemplate: "/v1/organizations/{organizationId}/members/{userId}",
    executionParameters: [{ "name": "organizationId", "in": "path" }, { "name": "userId", "in": "path" }],
  }],
  ["delete-invitation", {
    name: "delete-invitation",
    description: "This endpoint removes an Invitation identified by the `invitationId` parameter.",
    inputSchema: z.object({
      invitationId: z.string().uuid().describe("The identifier of the Invitation."),
    }),
    method: "delete",
    pathTemplate: "/v1/invitations/{invitationId}",
    executionParameters: [{ "name": "invitationId", "in": "path" }],
  }],
  ["delete-product-member", {
    name: "delete-product-member",
    description: `This endpoint removes a Member identified by the \`userId\` from the 
given Product identified by the \`productId\` parameter.`,
    inputSchema: z.object({
      productId: z.string().uuid().describe("The identifier of the Product."),
      userId: z.string().describe("The identifier of the Member."),
    }),
    method: "delete",
    pathTemplate: "/v1/products/{productId}/members/{userId}",
    executionParameters: [{ "name": "productId", "in": "path" }, { "name": "userId", "in": "path" }],
  }],
]);

/**
 * Registers the ConfigCat API tools with the given server and HTTP client.
 *
 * @param server The server instance to register the tools with.
 * @param http The HTTP client instance to use for API requests.
 */
export function registerConfigCatAPITools(
  server: Server,
  http: HttpClient
): void {
  server.setRequestHandler(ListToolsRequestSchema, () => {
    const toolsForClient: Tool[] = Array.from(toolDefinitionMap.values()).map(def => ({
      name: def.name,
      description: def.description,
      inputSchema: zodToJsonSchema(def.inputSchema) as ToolInput,
    }));
    return { tools: toolsForClient };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest): Promise<CallToolResult> => {
    const { name: toolName, arguments: toolArgs } = request.params;
    const toolDefinition = toolDefinitionMap.get(toolName);
    if (!toolDefinition) {
      console.error(`Error: Unknown tool requested: ${toolName}`);
      return { content: [{ type: "text", text: `Error: Unknown tool requested: ${toolName}` }] };
    }

    return await executeApiTool(http, toolName, toolDefinition, toolArgs ?? {});
  });
}

/**
 * Executes an API tool with the provided arguments
 *
 * @param toolName Name of the tool to execute
 * @param definition Tool definition
 * @param toolArgs Arguments provided by the user
 * @returns Call tool result
 */
async function executeApiTool(
  http: HttpClient,
  toolName: string,
  definition: McpToolDefinition,
  toolArgs: JsonObject
): Promise<CallToolResult> {
  try {
    // Validate arguments against the input schema
    let validatedArgs: JsonObject;
    try {
      const zodSchema = definition.inputSchema;
      const argsToParse = (typeof toolArgs === "object" && toolArgs !== null) ? toolArgs : {};
      validatedArgs = zodSchema.parse(argsToParse) as JsonObject;
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        const validationErrorMessage = `Invalid arguments for tool '${toolName}': ${error.errors.map(e => `${e.path.join(".")} (${e.code}): ${e.message}`).join(", ")}`;
        return { content: [{ type: "text", text: validationErrorMessage }] };
      } else {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return { content: [{ type: "text", text: `Internal error during validation setup: ${errorMessage}` }] };
      }
    }

    // Prepare URL, query parameters, headers, and request body
    let urlPath = definition.pathTemplate;
    const queryParams: Record<string, any> = {};
    const headers: Record<string, string> = {};
    let requestBodyData: unknown;

    // Apply parameters to the URL path, query, or headers
    definition.executionParameters.forEach((param) => {
      const value = validatedArgs[param.name];
      if (typeof value !== "undefined" && value !== null) {
        if (param.in === "path") {
          const stringValue = typeof value === "string" ? value : JSON.stringify(value);
          urlPath = urlPath.replace(`{${param.name}}`, encodeURIComponent(stringValue));
        } else if (param.in === "query") {
          queryParams[param.name] = value;
        } else if (param.in === "header") {
          const stringValue = typeof value === "string" ? value : JSON.stringify(value);
          headers[param.name.toLowerCase()] = stringValue;
        }
      }
    });

    // Ensure all path parameters are resolved
    if (urlPath.includes("{")) {
      throw new Error(`Failed to resolve path parameters: ${urlPath}`);
    }

    // Handle request body if needed
    if (typeof validatedArgs["requestBody"] !== "undefined") {
      requestBodyData = validatedArgs["requestBody"];
    }

    const method = definition.method.toUpperCase();

    // Log request info to stderr (doesn't affect MCP output)
    console.error(`Executing tool "${toolName}": ${method} ${urlPath}`);

    // Execute the request
    const response = await http.request(urlPath, {
      method: method,
      headers: headers,
      ...(typeof requestBodyData !== "undefined" && { body: JSON.stringify(requestBodyData) }),
    });

    let responseText = "";
    const ct = response.headers.get("content-type") ?? "";
    if (ct.includes("application/json")) {
      responseText = `API Response (Status: ${response.status}):\n${JSON.stringify(await response.json(), null, 2)}`;
    } else {
      responseText = await response.text();
      if (!responseText) {
        responseText = `(Status: ${response.status} - No body content)`;
      }
    }

    // Return formatted response
    return {
      content: [
        {
          type: "text",
          text: responseText,
        },
      ],
    };
  } catch (error: unknown) {
    // Handle errors during execution
    let errorMessage: string;

    // Handle standard errors
    if (error instanceof Error) {
      errorMessage = error.message;
    } else {
      // Handle unexpected error types
      errorMessage = "Unexpected error: " + String(error);
    }

    if (errorMessage.includes("HTTP 401 Unauthorized")) {
      errorMessage = " Invalid API credentials. Please check your CONFIGCAT_API_USER and CONFIGCAT_API_PASS environment variables. You can create your credentials on the <a target=\"_blank\" href=\"https://app.configcat.com/my-account/public-api-credentials\">Public API credentials management page</a>.";
    }

    // Log error to stderr
    console.error(`Error during execution of tool '${toolName}':`, errorMessage);

    // Return error message to client
    return { content: [{ type: "text", text: errorMessage }] };
  }
}

