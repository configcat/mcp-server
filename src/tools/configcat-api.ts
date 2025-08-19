import type { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  type CallToolRequest,
  CallToolRequestSchema,
  type CallToolResult,
  ListToolsRequestSchema,
  type Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { type JsonSchema, jsonSchemaToZod } from "json-schema-to-zod";
import { z, ZodError } from "zod";
import type { HttpClient } from "../http";

// Type definition for JSON objects
type JsonObject = Record<string, any>;

// Interface for MCP Tool Definition
interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: any;
  method: string;
  pathTemplate: string;
  executionParameters: { name: string; in: string }[];
}

// Map of tool definitions by name
const toolDefinitionMap = new Map<string, McpToolDefinition>([
  ["list-organizations", {
    name: "list-organizations",
    description: "This endpoint returns the list of the Organizations that belongs to the user.",
    inputSchema: { "type": "object", "properties": {} },
    method: "get",
    pathTemplate: "/v1/organizations",
    executionParameters: [],
  }],
  ["list-products", {
    name: "list-products",
    description: "This endpoint returns the list of the Products that belongs to the user.",
    inputSchema: { "type": "object", "properties": {} },
    method: "get",
    pathTemplate: "/v1/products",
    executionParameters: [],
  }],
  ["list-tags", {
    name: "list-tags",
    description: `This endpoint returns the list of the Tags in a 
specified Product, identified by the \`productId\` parameter.`,
    inputSchema: { "type": "object", "properties": { "productId": { "type": "string", "format": "uuid", "description": "The identifier of the Product." } }, "required": ["productId"] },
    method: "get",
    pathTemplate: "/v1/products/{productId}/tags",
    executionParameters: [{ "name": "productId", "in": "path" }],
  }],
  ["create-tag", {
    name: "create-tag",
    description: `This endpoint creates a new Tag in a specified Product 
identified by the \`productId\` parameter, which can be obtained from the [List Products](#operation/list-products) endpoint.`,
    inputSchema: { "type": "object", "properties": { "productId": { "type": "string", "format": "uuid", "description": "The identifier of the Organization." }, "requestBody": { "required": ["name"], "type": "object", "properties": { "name": { "maxLength": 255, "minLength": 1, "type": "string", "description": "Name of the Tag." }, "color": { "maxLength": 255, "minLength": 0, "type": ["string", "null"], "description": "Color of the Tag. Possible values: `panther`, `whale`, `salmon`, `lizard`, `canary`, `koala`, or any HTML color code." } }, "description": "The JSON request body." } }, "required": ["productId", "requestBody"] },
    method: "post",
    pathTemplate: "/v1/products/{productId}/tags",
    executionParameters: [{ "name": "productId", "in": "path" }],
  }],
  ["list-webhooks", {
    name: "list-webhooks",
    description: `This endpoint returns the list of the Webhooks that belongs to the given Product identified by the
\`productId\` parameter, which can be obtained from the [List Products](#operation/list-products) endpoint.`,
    inputSchema: { "type": "object", "properties": { "productId": { "type": "string", "format": "uuid", "description": "The identifier of the Product." } }, "required": ["productId"] },
    method: "get",
    pathTemplate: "/v1/products/{productId}/webhooks",
    executionParameters: [{ "name": "productId", "in": "path" }],
  }],
  ["list-configs", {
    name: "list-configs",
    description: `This endpoint returns the list of the Configs that belongs to the given Product identified by the
\`productId\` parameter, which can be obtained from the [List Products](#operation/list-products) endpoint.`,
    inputSchema: { "type": "object", "properties": { "productId": { "type": "string", "format": "uuid", "description": "The identifier of the Product." } }, "required": ["productId"] },
    method: "get",
    pathTemplate: "/v1/products/{productId}/configs",
    executionParameters: [{ "name": "productId", "in": "path" }],
  }],
  ["create-config", {
    name: "create-config",
    description: `This endpoint creates a new Config in a specified Product 
identified by the \`productId\` parameter, which can be obtained from the [List Products](#operation/list-products) endpoint.`,
    inputSchema: { "type": "object", "properties": { "productId": { "type": "string", "format": "uuid", "description": "The identifier of the Product." }, "requestBody": { "required": ["name"], "type": "object", "properties": { "name": { "maxLength": 255, "minLength": 1, "type": "string", "description": "The name of the Config." }, "description": { "maxLength": 1000, "minLength": 0, "type": ["string", "null"], "description": "The description of the Config." }, "order": { "type": ["number", "null"], "description": "The order of the Config represented on the ConfigCat Dashboard.\nDetermined from an ascending sequence of integers.", "format": "int32" }, "evaluationVersion": { "enum": ["v1", "v2"], "type": "string", "description": "Determines the evaluation version of a Config.\nUsing `v2` enables the new features of Config V2 (https://configcat.com/docs/advanced/config-v2)." } }, "description": "The JSON request body." } }, "required": ["productId", "requestBody"] },
    method: "post",
    pathTemplate: "/v1/products/{productId}/configs",
    executionParameters: [{ "name": "productId", "in": "path" }],
  }],
  ["list-environments", {
    name: "list-environments",
    description: `This endpoint returns the list of the Environments that belongs to the given Product identified by the
\`productId\` parameter, which can be obtained from the [List Products](#operation/list-products) endpoint.`,
    inputSchema: { "type": "object", "properties": { "productId": { "type": "string", "format": "uuid", "description": "The identifier of the Product." } }, "required": ["productId"] },
    method: "get",
    pathTemplate: "/v1/products/{productId}/environments",
    executionParameters: [{ "name": "productId", "in": "path" }],
  }],
  ["create-environment", {
    name: "create-environment",
    description: `This endpoint creates a new Environment in a specified Product 
identified by the \`productId\` parameter, which can be obtained from the [List Products](#operation/list-products) endpoint.`,
    inputSchema: { "type": "object", "properties": { "productId": { "type": "string", "format": "uuid", "description": "The identifier of the Product." }, "requestBody": { "required": ["name"], "type": "object", "properties": { "name": { "maxLength": 255, "minLength": 1, "type": "string", "description": "The name of the Environment." }, "color": { "maxLength": 255, "minLength": 0, "type": ["string", "null"], "description": "The color of the Environment. RGB or HTML color codes are allowed." }, "description": { "maxLength": 1000, "minLength": 0, "type": ["string", "null"], "description": "The description of the Environment." }, "order": { "type": ["number", "null"], "description": "The order of the Environment represented on the ConfigCat Dashboard.\nDetermined from an ascending sequence of integers.", "format": "int32" } }, "description": "The JSON request body." } }, "required": ["productId", "requestBody"] },
    method: "post",
    pathTemplate: "/v1/products/{productId}/environments",
    executionParameters: [{ "name": "productId", "in": "path" }],
  }],
  ["list-permission-groups", {
    name: "list-permission-groups",
    description: `This endpoint returns the list of the Permission Groups that belongs to the given Product identified by the
\`productId\` parameter, which can be obtained from the [List Products](#operation/list-products) endpoint.`,
    inputSchema: { "type": "object", "properties": { "productId": { "type": "string", "format": "uuid", "description": "The identifier of the Product." } }, "required": ["productId"] },
    method: "get",
    pathTemplate: "/v1/products/{productId}/permissions",
    executionParameters: [{ "name": "productId", "in": "path" }],
  }],
  ["create-permission-group", {
    name: "create-permission-group",
    description: `This endpoint creates a new Permission Group in a specified Product 
identified by the \`productId\` parameter, which can be obtained from the [List Products](#operation/list-products) endpoint.`,
    inputSchema: { "type": "object", "properties": { "productId": { "type": "string", "format": "uuid", "description": "The identifier of the Product." }, "requestBody": { "required": ["name"], "type": "object", "properties": { "name": { "maxLength": 255, "minLength": 1, "type": "string", "description": "Name of the Permission Group." }, "canManageMembers": { "type": "boolean", "description": "Group members can manage team members." }, "canCreateOrUpdateConfig": { "type": "boolean", "description": "Group members can create/update Configs." }, "canDeleteConfig": { "type": "boolean", "description": "Group members can delete Configs." }, "canCreateOrUpdateEnvironment": { "type": "boolean", "description": "Group members can create/update Environments." }, "canDeleteEnvironment": { "type": "boolean", "description": "Group members can delete Environments." }, "canCreateOrUpdateSetting": { "type": "boolean", "description": "Group members can create/update Feature Flags and Settings." }, "canTagSetting": { "type": "boolean", "description": "Group members can attach/detach Tags to Feature Flags and Settings." }, "canDeleteSetting": { "type": "boolean", "description": "Group members can delete Feature Flags and Settings." }, "canCreateOrUpdateTag": { "type": "boolean", "description": "Group members can create/update Tags." }, "canDeleteTag": { "type": "boolean", "description": "Group members can delete Tags." }, "canManageWebhook": { "type": "boolean", "description": "Group members can create/update/delete Webhooks." }, "canUseExportImport": { "type": "boolean", "description": "Group members can use the export/import feature." }, "canManageProductPreferences": { "type": "boolean", "description": "Group members can update Product preferences." }, "canManageIntegrations": { "type": "boolean", "description": "Group members can add and configure integrations." }, "canViewSdkKey": { "type": "boolean", "description": "Group members has access to SDK keys." }, "canRotateSdkKey": { "type": "boolean", "description": "Group members can rotate SDK keys." }, "canCreateOrUpdateSegments": { "type": "boolean", "description": "Group members can create/update Segments." }, "canDeleteSegments": { "type": "boolean", "description": "Group members can delete Segments." }, "canViewProductAuditLog": { "type": "boolean", "description": "Group members has access to audit logs." }, "canViewProductStatistics": { "type": "boolean", "description": "Group members has access to product statistics." }, "accessType": { "enum": ["readOnly", "full", "custom"], "type": "string", "description": "Represent the Feature Management permission." }, "newEnvironmentAccessType": { "enum": ["full", "readOnly", "none"], "type": "string", "description": "Represent the environment specific Feature Management permission." }, "environmentAccesses": { "type": ["array", "null"], "items": { "type": "object", "properties": { "environmentId": { "type": "string", "description": "Identifier of the Environment.", "format": "uuid" }, "environmentAccessType": { "enum": ["full", "readOnly", "none"], "type": "string", "description": "Represent the environment specific Feature Management permission." } } }, "description": "List of environment specific permissions." }, "canDisable2FA": { "type": "boolean", "description": "Group members can disable two-factor authentication for other members." } }, "description": "The JSON request body." } }, "required": ["productId", "requestBody"] },
    method: "post",
    pathTemplate: "/v1/products/{productId}/permissions",
    executionParameters: [{ "name": "productId", "in": "path" }],
  }],
  ["list-integrations", {
    name: "list-integrations",
    description: `This endpoint returns the list of the Integrations that belongs to the given Product identified by the
\`productId\` parameter, which can be obtained from the [List Products](#operation/list-products) endpoint.`,
    inputSchema: { "type": "object", "properties": { "productId": { "type": "string", "format": "uuid", "description": "The identifier of the Product." } }, "required": ["productId"] },
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
    inputSchema: { "type": "object", "properties": { "productId": { "type": "string", "format": "uuid", "description": "The identifier of the Product." }, "requestBody": { "required": ["configIds", "environmentIds", "integrationType", "name", "parameters"], "type": "object", "properties": { "integrationType": { "enum": ["dataDog", "slack", "amplitude", "mixPanel", "segment", "pubNub"], "type": "string" }, "name": { "minLength": 1, "type": "string", "description": "Name of the Integration." }, "parameters": { "type": "object", "additionalProperties": { "type": "string", "nullable": true }, "description": "Parameters of the Integration." }, "environmentIds": { "type": "array", "items": { "type": "string", "format": "uuid" }, "description": "List of Environment IDs that are connected with this Integration. If the list is empty, all of the Environments are connected." }, "configIds": { "type": "array", "items": { "type": "string", "format": "uuid" }, "description": "List of Config IDs that are connected with this Integration. If the list is empty, all of the Configs are connected." } }, "description": "The JSON request body." } }, "required": ["productId", "requestBody"] },
    method: "post",
    pathTemplate: "/v1/products/{productId}/integrations",
    executionParameters: [{ "name": "productId", "in": "path" }],
  }],
  ["list-segments", {
    name: "list-segments",
    description: `This endpoint returns the list of the Segments that belongs to the given Product identified by the
\`productId\` parameter, which can be obtained from the [List Products](#operation/list-products) endpoint.`,
    inputSchema: { "type": "object", "properties": { "productId": { "type": "string", "format": "uuid", "description": "The identifier of the Product." } }, "required": ["productId"] },
    method: "get",
    pathTemplate: "/v1/products/{productId}/segments",
    executionParameters: [{ "name": "productId", "in": "path" }],
  }],
  ["create-segment", {
    name: "create-segment",
    description: `This endpoint creates a new Segment in a specified Product 
identified by the \`productId\` parameter, which can be obtained from the [List Products](#operation/list-products) endpoint.`,
    inputSchema: { "type": "object", "properties": { "productId": { "type": "string", "format": "uuid", "description": "The identifier of the Product." }, "requestBody": { "required": ["comparator", "comparisonAttribute", "comparisonValue", "name"], "type": "object", "properties": { "name": { "maxLength": 255, "minLength": 1, "type": "string", "description": "Name of the Segment." }, "description": { "maxLength": 1000, "minLength": 0, "type": ["string", "null"], "description": "Description of the Segment." }, "comparisonAttribute": { "maxLength": 1000, "minLength": 1, "type": "string", "description": "The user's attribute the evaluation process must take into account." }, "comparator": { "enum": ["isOneOf", "isNotOneOf", "contains", "doesNotContain", "semVerIsOneOf", "semVerIsNotOneOf", "semVerLess", "semVerLessOrEquals", "semVerGreater", "semVerGreaterOrEquals", "numberEquals", "numberDoesNotEqual", "numberLess", "numberLessOrEquals", "numberGreater", "numberGreaterOrEquals", "sensitiveIsOneOf", "sensitiveIsNotOneOf"], "type": "string", "description": "The comparison operator the evaluation process must use when it compares the given user attribute's value with the comparison value." }, "comparisonValue": { "minLength": 1, "type": "string", "description": "The value to compare with the given user attribute's value." } }, "description": "The JSON request body." } }, "required": ["productId", "requestBody"] },
    method: "post",
    pathTemplate: "/v1/products/{productId}/segments",
    executionParameters: [{ "name": "productId", "in": "path" }],
  }],
  ["list-settings", {
    name: "list-settings",
    description: `This endpoint returns the list of the Feature Flags and Settings defined in a 
specified Config, identified by the \`configId\` parameter.`,
    inputSchema: { "type": "object", "properties": { "configId": { "type": "string", "format": "uuid", "description": "The identifier of the Config." } }, "required": ["configId"] },
    method: "get",
    pathTemplate: "/v1/configs/{configId}/settings",
    executionParameters: [{ "name": "configId", "in": "path" }],
  }],
  ["create-setting", {
    name: "create-setting",
    description: `This endpoint creates a new Feature Flag or Setting in a specified Config
identified by the \`configId\` parameter.

**Important:** The \`key\` attribute must be unique within the given Config.`,
    inputSchema: { "type": "object", "properties": { "configId": { "type": "string", "format": "uuid", "description": "The identifier of the Config." }, "requestBody": { "required": ["key", "name", "settingType"], "type": "object", "properties": { "hint": { "maxLength": 1000, "minLength": 0, "type": ["string", "null"], "description": "A short description for the setting, shown on the Dashboard UI." }, "tags": { "type": ["array", "null"], "items": { "type": "integer", "format": "int64" }, "description": "The IDs of the tags which are attached to the setting." }, "order": { "type": ["number", "null"], "description": "The order of the Setting represented on the ConfigCat Dashboard.\nDetermined from an ascending sequence of integers.", "format": "int32" }, "key": { "maxLength": 255, "minLength": 1, "type": "string", "description": "The key of the Feature Flag or Setting." }, "name": { "maxLength": 255, "minLength": 1, "type": "string", "description": "The name of the Feature Flag or Setting." }, "settingType": { "enum": ["boolean", "string", "int", "double"], "type": "string", "description": "The type of the Feature Flag or Setting." }, "initialValues": { "type": ["array", "null"], "items": { "required": ["value"], "type": "object", "properties": { "environmentId": { "type": "string", "description": "The ID of the Environment where the initial value must be set.", "format": "uuid" }, "value": { "allOf": [{ "oneOf": [{ "type": "boolean" }, { "type": "string" }, { "type": "number", "format": "double" }] }], "description": "The initial value in the given Environment. It must respect the setting type. In some generated clients for strictly typed languages you may use double/float properties to handle integer values." } } }, "description": "Optional, initial value of the Feature Flag or Setting in the given Environments. Only one of the SettingIdToInitFrom or the InitialValues properties can be set." }, "settingIdToInitFrom": { "type": ["number", "null"], "description": "Optional, the SettingId to initialize the values and tags of the Feature Flag or Setting from. Only can be set if you have at least ReadOnly access in all the Environments. Only one of the SettingIdToInitFrom or the InitialValues properties can be set.", "format": "int32" } }, "description": "The JSON request body." } }, "required": ["configId", "requestBody"] },
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
    inputSchema: { "type": "object", "properties": { "productId": { "type": "string", "format": "uuid", "description": "The identifier of the Product." }, "configId": { "type": "string", "format": "uuid", "description": "The identifier of the Config." }, "environmentId": { "type": "string", "format": "uuid", "description": "The identifier of the Environment." }, "auditLogType": { "allOf": [{ "enum": ["productCreated", "productChanged", "productOwnershipTransferred", "productDeleted", "productsReordered", "teamMemberInvited", "teamMemberInvitationRevoked", "teamMemberJoined", "teamMemberPermissionGroupChanged", "teamMemberRemoved", "teamMemberLeft", "teamMemberInvitationChanged", "teamMemberInvitationResent", "teamMemberInvitationRejected", "configCreated", "configChanged", "configDeleted", "configsReordered", "environmentCreated", "environmentChanged", "environmentDeleted", "environmentsReordered", "settingCreated", "settingChanged", "settingDeleted", "settingsReordered", "settingValueChanged", "webHookCreated", "webHookChanged", "webHookDeleted", "permissionGroupCreated", "permissionGroupChanged", "permissionGroupDeleted", "permissionGroupDefault", "apiKeyAdded", "apiKeyRemoved", "integrationAdded", "integrationChanged", "integrationRemoved", "apiKeyConnected", "integrationLinkAdded", "integrationLinkRemoved", "organizationAdded", "organizationRemoved", "organizationChanged", "organizationSubscriptionTypeChanged", "organizationAdminChanged", "organizationAdminLeft", "twoFactorDisabledForMember", "tagAdded", "tagChanged", "tagRemoved", "settingTagAdded", "settingTagRemoved", "publicApiAccessTokenAdded", "publicApiAccessTokenRemoved", "domainAdded", "domainVerified", "domainRemoved", "domainSamlConfigured", "domainSamlDeleted", "autoProvisioningConfigurationChanged", "samlIdpConfigurationAdded", "samlIdpConfigurationRemoved", "samlIdpConfigurationUpdated", "autoProvisioningEnabledChanged", "organizationMemberJoined", "organizationMemberProductJoinRequested", "organizationMemberProductJoinRequestRejected", "organizationMemberProductJoinRequestApproved", "organizationMemberRemoved", "codeReferencesUploaded", "codeReferenceDeleted", "codeReferenceStaleBranchDeleted", "segmentCreated", "segmentChanged", "segmentDeleted", "webhookSigningKeyDeleted", "webhookSigningKeyCreated", "userProvisioningConfigurationChanged", "syncGroupProvisioningRuleChanged", "syncGroupsReordered", "syncUserProvisioningEnabled", "syncUserProvisioningDisabled", "userEmailChanged", "userFullNameChanged", "userDisabled", "awsConnected", "awsDisconnected", "userEnabled", "syncUserDeleted", "syncGroupDeleted", "proxyConfigurationCreated", "proxyConfigurationChanged", "proxyConfigurationDeleted", "proxyConfigurationSecretRegenerated", "proxyNotificationSettingsUpdated", "proxyNotificationSettingsDeleted", "proxyNotificationSigningKeyAdded", "proxyNotificationSigningKeyDeleted"], "type": "string" }], "type": "null", "description": "Filter Audit logs by Audit log type." }, "fromUtcDateTime": { "type": "string", "format": "date-time", "description": "Filter Audit logs by starting UTC date." }, "toUtcDateTime": { "type": "string", "format": "date-time", "description": "Filter Audit logs by ending UTC date." } }, "required": ["productId"] },
    method: "get",
    pathTemplate: "/v1/products/{productId}/auditlogs",
    executionParameters: [{ "name": "productId", "in": "path" }, { "name": "configId", "in": "query" }, { "name": "environmentId", "in": "query" }, { "name": "auditLogType", "in": "query" }, { "name": "fromUtcDateTime", "in": "query" }, { "name": "toUtcDateTime", "in": "query" }],
  }],
  ["list-staleflags", {
    name: "list-staleflags",
    description: `This endpoint returns the list of Zombie (stale) flags for a given Product 
and the result can be optionally filtered by various parameters.`,
    inputSchema: { "type": "object", "properties": { "productId": { "type": "string", "format": "uuid", "description": "The identifier of the Product." }, "scope": { "enum": ["all", "watchedByMe"], "type": "string", "description": "The scope of the report." }, "staleFlagAgeDays": { "maximum": 90, "minimum": 7, "type": "number", "format": "int32", "description": "The inactivity in days after a feature flag should be considered stale." }, "staleFlagStaleInEnvironmentsType": { "enum": ["staleInAnyEnvironments", "staleInAllEnvironments"], "type": "string", "description": "Consider a feature flag as stale if the feature flag is stale in all/any of the environments." }, "ignoredEnvironmentIds": { "type": "array", "items": { "type": "string", "format": "uuid" }, "description": "Ignore environment identifiers from the report." }, "ignoredTagIds": { "type": "array", "items": { "type": "number", "format": "int64" }, "description": "Ignore feature flags from the report based on their tag identifiers." } }, "required": ["productId"] },
    method: "get",
    pathTemplate: "/v1/products/{productId}/staleflags",
    executionParameters: [{ "name": "productId", "in": "path" }, { "name": "scope", "in": "query" }, { "name": "staleFlagAgeDays", "in": "query" }, { "name": "staleFlagStaleInEnvironmentsType", "in": "query" }, { "name": "ignoredEnvironmentIds", "in": "query" }, { "name": "ignoredTagIds", "in": "query" }],
  }],
  ["GetV1SettingsCodeReferences", {
    name: "GetV1SettingsCodeReferences",
    description: "Get References for Feature Flag or Setting",
    inputSchema: { "type": "object", "properties": { "settingId": { "type": "number", "format": "int32", "description": "The identifier of the Feature Flag or Setting." } }, "required": ["settingId"] },
    method: "get",
    pathTemplate: "/v1/settings/{settingId}/code-references",
    executionParameters: [{ "name": "settingId", "in": "path" }],
  }],
  ["get-config", {
    name: "get-config",
    description: `This endpoint returns the metadata of a Config
identified by the \`configId\`.`,
    inputSchema: { "type": "object", "properties": { "configId": { "type": "string", "format": "uuid", "description": "The identifier of the Config." } }, "required": ["configId"] },
    method: "get",
    pathTemplate: "/v1/configs/{configId}",
    executionParameters: [{ "name": "configId", "in": "path" }],
  }],
  ["update-config", {
    name: "update-config",
    description: "This endpoint updates a Config identified by the `configId` parameter.",
    inputSchema: { "type": "object", "properties": { "configId": { "type": "string", "format": "uuid", "description": "The identifier of the Config." }, "requestBody": { "type": "object", "properties": { "name": { "maxLength": 255, "minLength": 0, "type": ["string", "null"], "description": "The name of the Config." }, "description": { "maxLength": 1000, "minLength": 0, "type": ["string", "null"], "description": "The description of the Config." }, "order": { "type": ["number", "null"], "description": "The order of the Config represented on the ConfigCat Dashboard.\nDetermined from an ascending sequence of integers.", "format": "int32" } }, "description": "The JSON request body." } }, "required": ["configId", "requestBody"] },
    method: "put",
    pathTemplate: "/v1/configs/{configId}",
    executionParameters: [{ "name": "configId", "in": "path" }],
  }],
  ["delete-config", {
    name: "delete-config",
    description: "This endpoint removes a Config identified by the `configId` parameter.",
    inputSchema: { "type": "object", "properties": { "configId": { "type": "string", "format": "uuid", "description": "The identifier of the Config." } }, "required": ["configId"] },
    method: "delete",
    pathTemplate: "/v1/configs/{configId}",
    executionParameters: [{ "name": "configId", "in": "path" }],
  }],
  ["list-deleted-settings", {
    name: "list-deleted-settings",
    description: "This endpoint returns the list of Feature Flags and Settings that were deleted from the given Config.",
    inputSchema: { "type": "object", "properties": { "configId": { "type": "string", "format": "uuid", "description": "The identifier of the Config." } }, "required": ["configId"] },
    method: "get",
    pathTemplate: "/v1/configs/{configId}/deleted-settings",
    executionParameters: [{ "name": "configId", "in": "path" }],
  }],
  ["get-environment", {
    name: "get-environment",
    description: `This endpoint returns the metadata of an Environment 
identified by the \`environmentId\`.`,
    inputSchema: { "type": "object", "properties": { "environmentId": { "type": "string", "format": "uuid", "description": "The identifier of the Environment." } }, "required": ["environmentId"] },
    method: "get",
    pathTemplate: "/v1/environments/{environmentId}",
    executionParameters: [{ "name": "environmentId", "in": "path" }],
  }],
  ["update-environment", {
    name: "update-environment",
    description: "This endpoint updates an Environment identified by the `environmentId` parameter.",
    inputSchema: { "type": "object", "properties": { "environmentId": { "type": "string", "format": "uuid", "description": "The identifier of the Environment." }, "requestBody": { "type": "object", "properties": { "name": { "maxLength": 255, "minLength": 0, "type": ["string", "null"], "description": "The name of the Environment." }, "color": { "maxLength": 255, "minLength": 0, "type": ["string", "null"], "description": "The color of the Environment. RGB or HTML color codes are allowed." }, "description": { "maxLength": 1000, "minLength": 0, "type": ["string", "null"], "description": "The description of the Environment." }, "order": { "type": ["number", "null"], "description": "The order of the Environment represented on the ConfigCat Dashboard.\nDetermined from an ascending sequence of integers.", "format": "int32" } }, "description": "The JSON request body." } }, "required": ["environmentId", "requestBody"] },
    method: "put",
    pathTemplate: "/v1/environments/{environmentId}",
    executionParameters: [{ "name": "environmentId", "in": "path" }],
  }],
  ["delete-environment", {
    name: "delete-environment",
    description: `This endpoint removes an Environment identified by the \`environmentId\` parameter.
If the \`cleanupAuditLogs\` flag is set to true, it also deletes the audit log records related to the environment
(except for the \`Created a new environment\` and \`Deleted an environment\` records).`,
    inputSchema: { "type": "object", "properties": { "environmentId": { "type": "string", "format": "uuid", "description": "The identifier of the Environment." }, "cleanupAuditLogs": { "type": "boolean", "description": "An optional flag which indicates whether the audit log records related to the environment should be deleted or not." } }, "required": ["environmentId"] },
    method: "delete",
    pathTemplate: "/v1/environments/{environmentId}",
    executionParameters: [{ "name": "environmentId", "in": "path" }, { "name": "cleanupAuditLogs", "in": "query" }],
  }],
  ["get-permission-group", {
    name: "get-permission-group",
    description: `This endpoint returns the metadata of a Permission Group 
identified by the \`permissionGroupId\`.`,
    inputSchema: { "type": "object", "properties": { "permissionGroupId": { "type": "number", "format": "int64", "description": "The identifier of the Permission Group." } }, "required": ["permissionGroupId"] },
    method: "get",
    pathTemplate: "/v1/permissions/{permissionGroupId}",
    executionParameters: [{ "name": "permissionGroupId", "in": "path" }],
  }],
  ["update-permission-group", {
    name: "update-permission-group",
    description: "This endpoint updates a Permission Group identified by the `permissionGroupId` parameter.",
    inputSchema: { "type": "object", "properties": { "permissionGroupId": { "type": "number", "format": "int64", "description": "The identifier of the Permission Group." }, "requestBody": { "type": "object", "properties": { "name": { "maxLength": 255, "minLength": 0, "type": ["string", "null"], "description": "Name of the Permission Group." }, "canManageMembers": { "type": ["boolean", "null"], "description": "Group members can manage team members." }, "canCreateOrUpdateConfig": { "type": ["boolean", "null"], "description": "Group members can create/update Configs." }, "canDeleteConfig": { "type": ["boolean", "null"], "description": "Group members can delete Configs." }, "canCreateOrUpdateEnvironment": { "type": ["boolean", "null"], "description": "Group members can create/update Environments." }, "canDeleteEnvironment": { "type": ["boolean", "null"], "description": "Group members can delete Environments." }, "canCreateOrUpdateSetting": { "type": ["boolean", "null"], "description": "Group members can create/update Feature Flags and Settings." }, "canTagSetting": { "type": ["boolean", "null"], "description": "Group members can attach/detach Tags to Feature Flags and Settings." }, "canDeleteSetting": { "type": ["boolean", "null"], "description": "Group members can delete Feature Flags and Settings." }, "canCreateOrUpdateTag": { "type": ["boolean", "null"], "description": "Group members can create/update Tags." }, "canDeleteTag": { "type": ["boolean", "null"], "description": "Group members can delete Tags." }, "canManageWebhook": { "type": ["boolean", "null"], "description": "Group members can create/update/delete Webhooks." }, "canUseExportImport": { "type": ["boolean", "null"], "description": "Group members can use the export/import feature." }, "canManageProductPreferences": { "type": ["boolean", "null"], "description": "Group members can update Product preferences." }, "canManageIntegrations": { "type": ["boolean", "null"], "description": "Group members can add and configure integrations." }, "canViewSdkKey": { "type": ["boolean", "null"], "description": "Group members has access to SDK keys." }, "canRotateSdkKey": { "type": ["boolean", "null"], "description": "Group members can rotate SDK keys." }, "canCreateOrUpdateSegments": { "type": ["boolean", "null"], "description": "Group members can create/update Segments." }, "canDeleteSegments": { "type": ["boolean", "null"], "description": "Group members can delete Segments." }, "canViewProductAuditLog": { "type": ["boolean", "null"], "description": "Group members has access to audit logs." }, "canViewProductStatistics": { "type": ["boolean", "null"], "description": "Group members has access to product statistics." }, "canDisable2FA": { "type": ["boolean", "null"], "description": "Group members can disable two-factor authentication for other members." }, "accessType": { "allOf": [{ "enum": ["readOnly", "full", "custom"], "type": "string", "description": "Represent the Feature Management permission." }], "type": "null" }, "newEnvironmentAccessType": { "allOf": [{ "enum": ["full", "readOnly", "none"], "type": "string", "description": "Represent the environment specific Feature Management permission." }], "type": "null" }, "environmentAccesses": { "type": ["array", "null"], "items": { "type": "object", "properties": { "environmentId": { "type": "string", "description": "Identifier of the Environment.", "format": "uuid" }, "environmentAccessType": { "enum": ["full", "readOnly", "none"], "type": "string", "description": "Represent the environment specific Feature Management permission." } } }, "description": "List of environment specific permissions." } }, "description": "The JSON request body." } }, "required": ["permissionGroupId", "requestBody"] },
    method: "put",
    pathTemplate: "/v1/permissions/{permissionGroupId}",
    executionParameters: [{ "name": "permissionGroupId", "in": "path" }],
  }],
  ["delete-permission-group", {
    name: "delete-permission-group",
    description: "This endpoint removes a Permission Group identified by the `permissionGroupId` parameter.",
    inputSchema: { "type": "object", "properties": { "permissionGroupId": { "type": "number", "format": "int64", "description": "The identifier of the Permission Group." } }, "required": ["permissionGroupId"] },
    method: "delete",
    pathTemplate: "/v1/permissions/{permissionGroupId}",
    executionParameters: [{ "name": "permissionGroupId", "in": "path" }],
  }],
  ["get-integration", {
    name: "get-integration",
    description: `This endpoint returns the metadata of an Integration
identified by the \`integrationId\`.`,
    inputSchema: { "type": "object", "properties": { "integrationId": { "type": "string", "format": "uuid", "description": "The identifier of the Integration." } }, "required": ["integrationId"] },
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
    inputSchema: { "type": "object", "properties": { "integrationId": { "type": "string", "format": "uuid", "description": "The identifier of the Integration." }, "requestBody": { "required": ["configIds", "environmentIds", "name", "parameters"], "type": "object", "properties": { "name": { "minLength": 1, "type": "string", "description": "Name of the Integration." }, "parameters": { "type": "object", "additionalProperties": { "type": "string", "nullable": true }, "description": "Parameters of the Integration." }, "environmentIds": { "type": "array", "items": { "type": "string", "format": "uuid" }, "description": "List of Environment IDs that are connected with this Integration. If the list is empty, all of the Environments are connected." }, "configIds": { "type": "array", "items": { "type": "string", "format": "uuid" }, "description": "List of Config IDs that are connected with this Integration. If the list is empty, all of the Configs are connected." } }, "description": "The JSON request body." } }, "required": ["integrationId", "requestBody"] },
    method: "put",
    pathTemplate: "/v1/integrations/{integrationId}",
    executionParameters: [{ "name": "integrationId", "in": "path" }],
  }],
  ["delete-integration", {
    name: "delete-integration",
    description: "This endpoint removes a Integration identified by the `integrationId` parameter.",
    inputSchema: { "type": "object", "properties": { "integrationId": { "type": "string", "format": "uuid", "description": "The identifier of the Integration." } }, "required": ["integrationId"] },
    method: "delete",
    pathTemplate: "/v1/integrations/{integrationId}",
    executionParameters: [{ "name": "integrationId", "in": "path" }],
  }],
  ["get-integration-link-details", {
    name: "get-integration-link-details",
    description: "Get Integration link",
    inputSchema: { "type": "object", "properties": { "integrationLinkType": { "enum": ["trello", "jira", "monday"], "type": "string", "description": "The integration link's type." }, "key": { "type": "string", "description": "The key of the integration link." } }, "required": ["integrationLinkType", "key"] },
    method: "get",
    pathTemplate: "/v1/integrationLink/{integrationLinkType}/{key}/details",
    executionParameters: [{ "name": "integrationLinkType", "in": "path" }, { "name": "key", "in": "path" }],
  }],
  ["get-sdk-keys", {
    name: "get-sdk-keys",
    description: "This endpoint returns the SDK Key for your Config in a specified Environment.",
    inputSchema: { "type": "object", "properties": { "configId": { "type": "string", "format": "uuid", "description": "The identifier of the Config." }, "environmentId": { "type": "string", "format": "uuid", "description": "The identifier of the Environment." } }, "required": ["configId", "environmentId"] },
    method: "get",
    pathTemplate: "/v1/configs/{configId}/environments/{environmentId}",
    executionParameters: [{ "name": "configId", "in": "path" }, { "name": "environmentId", "in": "path" }],
  }],
  ["get-me", {
    name: "get-me",
    description: "Get authenticated user details",
    inputSchema: { "type": "object", "properties": {} },
    method: "get",
    pathTemplate: "/v1/me",
    executionParameters: [],
  }],
  ["list-organization-auditlogs", {
    name: "list-organization-auditlogs",
    description: `This endpoint returns the list of Audit log items for a given Organization 
and the result can be optionally filtered by Product and/or Config and/or Environment.

If neither \`fromUtcDateTime\` nor \`toUtcDateTime\` is set, the audit logs for the **last 7 days** will be returned.

The distance between \`fromUtcDateTime\` and \`toUtcDateTime\` cannot exceed **30 days**.`,
    inputSchema: { "type": "object", "properties": { "organizationId": { "type": "string", "format": "uuid", "description": "The identifier of the Organization." }, "productId": { "type": "string", "format": "uuid", "description": "The identifier of the Product." }, "configId": { "type": "string", "format": "uuid", "description": "The identifier of the Config." }, "environmentId": { "type": "string", "format": "uuid", "description": "The identifier of the Environment." }, "auditLogType": { "allOf": [{ "enum": ["productCreated", "productChanged", "productOwnershipTransferred", "productDeleted", "productsReordered", "teamMemberInvited", "teamMemberInvitationRevoked", "teamMemberJoined", "teamMemberPermissionGroupChanged", "teamMemberRemoved", "teamMemberLeft", "teamMemberInvitationChanged", "teamMemberInvitationResent", "teamMemberInvitationRejected", "configCreated", "configChanged", "configDeleted", "configsReordered", "environmentCreated", "environmentChanged", "environmentDeleted", "environmentsReordered", "settingCreated", "settingChanged", "settingDeleted", "settingsReordered", "settingValueChanged", "webHookCreated", "webHookChanged", "webHookDeleted", "permissionGroupCreated", "permissionGroupChanged", "permissionGroupDeleted", "permissionGroupDefault", "apiKeyAdded", "apiKeyRemoved", "integrationAdded", "integrationChanged", "integrationRemoved", "apiKeyConnected", "integrationLinkAdded", "integrationLinkRemoved", "organizationAdded", "organizationRemoved", "organizationChanged", "organizationSubscriptionTypeChanged", "organizationAdminChanged", "organizationAdminLeft", "twoFactorDisabledForMember", "tagAdded", "tagChanged", "tagRemoved", "settingTagAdded", "settingTagRemoved", "publicApiAccessTokenAdded", "publicApiAccessTokenRemoved", "domainAdded", "domainVerified", "domainRemoved", "domainSamlConfigured", "domainSamlDeleted", "autoProvisioningConfigurationChanged", "samlIdpConfigurationAdded", "samlIdpConfigurationRemoved", "samlIdpConfigurationUpdated", "autoProvisioningEnabledChanged", "organizationMemberJoined", "organizationMemberProductJoinRequested", "organizationMemberProductJoinRequestRejected", "organizationMemberProductJoinRequestApproved", "organizationMemberRemoved", "codeReferencesUploaded", "codeReferenceDeleted", "codeReferenceStaleBranchDeleted", "segmentCreated", "segmentChanged", "segmentDeleted", "webhookSigningKeyDeleted", "webhookSigningKeyCreated", "userProvisioningConfigurationChanged", "syncGroupProvisioningRuleChanged", "syncGroupsReordered", "syncUserProvisioningEnabled", "syncUserProvisioningDisabled", "userEmailChanged", "userFullNameChanged", "userDisabled", "awsConnected", "awsDisconnected", "userEnabled", "syncUserDeleted", "syncGroupDeleted", "proxyConfigurationCreated", "proxyConfigurationChanged", "proxyConfigurationDeleted", "proxyConfigurationSecretRegenerated", "proxyNotificationSettingsUpdated", "proxyNotificationSettingsDeleted", "proxyNotificationSigningKeyAdded", "proxyNotificationSigningKeyDeleted"], "type": "string" }], "type": "null", "description": "Filter Audit logs by Audit log type." }, "fromUtcDateTime": { "type": "string", "format": "date-time", "description": "Filter Audit logs by starting UTC date." }, "toUtcDateTime": { "type": "string", "format": "date-time", "description": "Filter Audit logs by ending UTC date." } }, "required": ["organizationId"] },
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
    inputSchema: { "type": "object", "properties": { "organizationId": { "type": "string", "format": "uuid", "description": "The identifier of the Organization." } }, "required": ["organizationId"] },
    method: "get",
    pathTemplate: "/v1/organizations/{organizationId}/members",
    executionParameters: [{ "name": "organizationId", "in": "path" }],
  }],
  ["list-organization-members-v2", {
    name: "list-organization-members-v2",
    description: `This endpoint returns the list of Members that belongs 
to the given Organization, identified by the \`organizationId\` parameter.

The results may vary based on the access level of the user who calls the endpoint: 
- When it's called with Organization Admin privileges, the result will contain each member in the Organization.
- When it's called without Organization Admin privileges, the result will contain each Organization Admin along with members 
  of those products where the caller has \`Team members and permission groups\` (\`canManageMembers\`) permission.`,
    inputSchema: { "type": "object", "properties": { "organizationId": { "type": "string", "format": "uuid", "description": "The identifier of the Organization." } }, "required": ["organizationId"] },
    method: "get",
    pathTemplate: "/v2/organizations/{organizationId}/members",
    executionParameters: [{ "name": "organizationId", "in": "path" }],
  }],
  ["list-pending-invitations-org", {
    name: "list-pending-invitations-org",
    description: `This endpoint returns the list of pending invitations within the
given Organization identified by the \`organizationId\` parameter.`,
    inputSchema: { "type": "object", "properties": { "organizationId": { "type": "string", "format": "uuid", "description": "The identifier of the Organization." } }, "required": ["organizationId"] },
    method: "get",
    pathTemplate: "/v1/organizations/{organizationId}/invitations",
    executionParameters: [{ "name": "organizationId", "in": "path" }],
  }],
  ["list-pending-invitations", {
    name: "list-pending-invitations",
    description: `This endpoint returns the list of pending invitations within the
given Product identified by the \`productId\` parameter.`,
    inputSchema: { "type": "object", "properties": { "productId": { "type": "string", "format": "uuid", "description": "The identifier of the Product." } }, "required": ["productId"] },
    method: "get",
    pathTemplate: "/v1/products/{productId}/invitations",
    executionParameters: [{ "name": "productId", "in": "path" }],
  }],
  ["get-product", {
    name: "get-product",
    description: `This endpoint returns the metadata of a Product 
identified by the \`productId\`.`,
    inputSchema: { "type": "object", "properties": { "productId": { "type": "string", "format": "uuid", "description": "The identifier of the Product." } }, "required": ["productId"] },
    method: "get",
    pathTemplate: "/v1/products/{productId}",
    executionParameters: [{ "name": "productId", "in": "path" }],
  }],
  ["update-product", {
    name: "update-product",
    description: "This endpoint updates a Product identified by the `productId` parameter.",
    inputSchema: { "type": "object", "properties": { "productId": { "type": "string", "format": "uuid", "description": "The identifier of the Product." }, "requestBody": { "type": "object", "properties": { "name": { "maxLength": 1000, "minLength": 0, "type": ["string", "null"], "description": "The name of the Product." }, "description": { "maxLength": 1000, "minLength": 0, "type": ["string", "null"], "description": "The description of the Product." }, "order": { "type": ["number", "null"], "description": "The order of the Product represented on the ConfigCat Dashboard.\nDetermined from an ascending sequence of integers.", "format": "int32" } }, "description": "The JSON request body." } }, "required": ["productId", "requestBody"] },
    method: "put",
    pathTemplate: "/v1/products/{productId}",
    executionParameters: [{ "name": "productId", "in": "path" }],
  }],
  ["delete-product", {
    name: "delete-product",
    description: "This endpoint removes a Product identified by the `productId` parameter.",
    inputSchema: { "type": "object", "properties": { "productId": { "type": "string", "format": "uuid", "description": "The identifier of the Product." } }, "required": ["productId"] },
    method: "delete",
    pathTemplate: "/v1/products/{productId}",
    executionParameters: [{ "name": "productId", "in": "path" }],
  }],
  ["list-product-members", {
    name: "list-product-members",
    description: `This endpoint returns the list of Members that belongs 
to the given Product, identified by the \`productId\` parameter.`,
    inputSchema: { "type": "object", "properties": { "productId": { "type": "string", "format": "uuid", "description": "The identifier of the Product." } }, "required": ["productId"] },
    method: "get",
    pathTemplate: "/v1/products/{productId}/members",
    executionParameters: [{ "name": "productId", "in": "path" }],
  }],
  ["get-product-preferences", {
    name: "get-product-preferences",
    description: `This endpoint returns the preferences of a Product 
identified by the \`productId\`.`,
    inputSchema: { "type": "object", "properties": { "productId": { "type": "string", "format": "uuid", "description": "The identifier of the Product." } }, "required": ["productId"] },
    method: "get",
    pathTemplate: "/v1/products/{productId}/preferences",
    executionParameters: [{ "name": "productId", "in": "path" }],
  }],
  ["update-product-preferences", {
    name: "update-product-preferences",
    description: "This endpoint updates the preferences of a Product identified by the `productId` parameter.",
    inputSchema: { "type": "object", "properties": { "productId": { "type": "string", "format": "uuid", "description": "The identifier of the Product." }, "requestBody": { "type": "object", "properties": { "reasonRequired": { "type": ["boolean", "null"], "description": "Indicates that a mandatory note is required for saving and publishing." }, "keyGenerationMode": { "allOf": [{ "enum": ["camelCase", "lowerCase", "upperCase", "pascalCase", "kebabCase"], "type": "string", "description": "Determines the Feature Flag key generation mode." }], "type": "null" }, "showVariationId": { "type": ["boolean", "null"], "description": "Indicates whether a variation ID's must be shown on the ConfigCat Dashboard." }, "mandatorySettingHint": { "type": ["boolean", "null"], "description": "Indicates whether Feature flags and Settings must have a hint." }, "reasonRequiredEnvironments": { "type": ["array", "null"], "items": { "type": "object", "properties": { "environmentId": { "type": "string", "description": "Identifier of the Environment.", "format": "uuid" }, "reasonRequired": { "type": "boolean", "description": "Indicates that a mandatory note is required in this Environment for saving and publishing." } } }, "description": "List of Environments where mandatory note must be set before saving and publishing." } }, "description": "The JSON request body." } }, "required": ["productId", "requestBody"] },
    method: "post",
    pathTemplate: "/v1/products/{productId}/preferences",
    executionParameters: [{ "name": "productId", "in": "path" }],
  }],
  ["get-segment", {
    name: "get-segment",
    description: `This endpoint returns the metadata of a Segment
identified by the \`segmentId\`.`,
    inputSchema: { "type": "object", "properties": { "segmentId": { "type": "string", "format": "uuid", "description": "The identifier of the Segment." } }, "required": ["segmentId"] },
    method: "get",
    pathTemplate: "/v1/segments/{segmentId}",
    executionParameters: [{ "name": "segmentId", "in": "path" }],
  }],
  ["update-segment", {
    name: "update-segment",
    description: "This endpoint updates a Segment identified by the `segmentId` parameter.",
    inputSchema: { "type": "object", "properties": { "segmentId": { "type": "string", "format": "uuid", "description": "The identifier of the Segment." }, "requestBody": { "type": "object", "properties": { "name": { "maxLength": 255, "minLength": 0, "type": ["string", "null"] }, "description": { "maxLength": 1000, "minLength": 0, "type": ["string", "null"] }, "comparisonAttribute": { "maxLength": 1000, "minLength": 0, "type": ["string", "null"] }, "comparator": { "allOf": [{ "enum": ["isOneOf", "isNotOneOf", "contains", "doesNotContain", "semVerIsOneOf", "semVerIsNotOneOf", "semVerLess", "semVerLessOrEquals", "semVerGreater", "semVerGreaterOrEquals", "numberEquals", "numberDoesNotEqual", "numberLess", "numberLessOrEquals", "numberGreater", "numberGreaterOrEquals", "sensitiveIsOneOf", "sensitiveIsNotOneOf"], "type": "string", "description": "The comparison operator the evaluation process must use when it compares the given user attribute's value with the comparison value." }], "type": "null" }, "comparisonValue": { "type": ["string", "null"] } }, "description": "The JSON request body." } }, "required": ["segmentId", "requestBody"] },
    method: "put",
    pathTemplate: "/v1/segments/{segmentId}",
    executionParameters: [{ "name": "segmentId", "in": "path" }],
  }],
  ["delete-segment", {
    name: "delete-segment",
    description: "This endpoint removes a Segment identified by the `segmentId` parameter.",
    inputSchema: { "type": "object", "properties": { "segmentId": { "type": "string", "format": "uuid", "description": "The identifier of the Segment." } }, "required": ["segmentId"] },
    method: "delete",
    pathTemplate: "/v1/segments/{segmentId}",
    executionParameters: [{ "name": "segmentId", "in": "path" }],
  }],
  ["get-setting", {
    name: "get-setting",
    description: `This endpoint returns the metadata attributes of a Feature Flag or Setting 
identified by the \`settingId\` parameter.`,
    inputSchema: { "type": "object", "properties": { "settingId": { "type": "number", "format": "int32", "description": "The identifier of the Setting." } }, "required": ["settingId"] },
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
    inputSchema: { "type": "object", "properties": { "settingId": { "type": "number", "format": "int32", "description": "The identifier of the Setting." }, "requestBody": { "type": "object", "properties": { "hint": { "maxLength": 1000, "minLength": 0, "type": ["string", "null"], "description": "A short description for the setting, shown on the Dashboard UI." }, "tags": { "type": ["array", "null"], "items": { "type": "integer", "format": "int64" }, "description": "The IDs of the tags which are attached to the setting." }, "order": { "type": ["number", "null"], "description": "The order of the Setting represented on the ConfigCat Dashboard.\nDetermined from an ascending sequence of integers.", "format": "int32" }, "name": { "maxLength": 255, "minLength": 1, "type": ["string", "null"], "description": "The name of the Feature Flag or Setting." } }, "description": "The JSON request body." } }, "required": ["settingId", "requestBody"] },
    method: "put",
    pathTemplate: "/v1/settings/{settingId}",
    executionParameters: [{ "name": "settingId", "in": "path" }],
  }],
  ["delete-setting", {
    name: "delete-setting",
    description: `This endpoint removes a Feature Flag or Setting from a specified Config, 
identified by the \`configId\` parameter.`,
    inputSchema: { "type": "object", "properties": { "settingId": { "type": "number", "format": "int32", "description": "The identifier of the Setting." } }, "required": ["settingId"] },
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
    inputSchema: { "type": "object", "properties": { "settingId": { "type": "number", "format": "int32", "description": "The identifier of the Setting." }, "requestBody": { "type": "array", "items": { "required": ["op", "path"], "type": "object", "properties": { "op": { "enum": ["unknown", "add", "remove", "replace", "move", "copy", "test"], "type": "string" }, "path": { "minLength": 1, "type": "string", "description": "The source path." }, "from": { "type": ["string", "null"], "description": "The target path." }, "value": { "description": "The discrete value.", "type": "null" } } }, "description": "The JSON request body." } }, "required": ["settingId", "requestBody"] },
    method: "patch",
    pathTemplate: "/v1/settings/{settingId}",
    executionParameters: [{ "name": "settingId", "in": "path" }],
  }],
  ["list-settings-by-tag", {
    name: "list-settings-by-tag",
    description: `This endpoint returns the list of the Settings that 
has the specified Tag, identified by the \`tagId\` parameter.`,
    inputSchema: { "type": "object", "properties": { "tagId": { "type": "number", "format": "int64", "description": "The identifier of the Tag." } }, "required": ["tagId"] },
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
    inputSchema: { "type": "object", "properties": { "settingKeyOrId": { "type": "string", "description": "The key or id of the Setting." }, "X-CONFIGCAT-SDKKEY": { "type": "string", "description": "The ConfigCat SDK Key. (https://app.configcat.com/sdkkey)" } }, "required": ["settingKeyOrId"] },
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
    inputSchema: { "type": "object", "properties": { "settingKeyOrId": { "type": "string", "description": "The key or id of the Setting." }, "reason": { "type": "string", "description": "The reason note for the Audit Log if the Product's \"Config changes require a reason\" preference is turned on." }, "X-CONFIGCAT-SDKKEY": { "type": "string", "description": "The ConfigCat SDK Key. (https://app.configcat.com/sdkkey)" }, "requestBody": { "required": ["value"], "type": "object", "properties": { "rolloutRules": { "type": "array", "items": { "required": ["value"], "type": "object", "properties": { "comparisonAttribute": { "maxLength": 1000, "minLength": 0, "type": ["string", "null"], "description": "The user attribute to compare." }, "comparator": { "allOf": [{ "enum": ["isOneOf", "isNotOneOf", "contains", "doesNotContain", "semVerIsOneOf", "semVerIsNotOneOf", "semVerLess", "semVerLessOrEquals", "semVerGreater", "semVerGreaterOrEquals", "numberEquals", "numberDoesNotEqual", "numberLess", "numberLessOrEquals", "numberGreater", "numberGreaterOrEquals", "sensitiveIsOneOf", "sensitiveIsNotOneOf"], "type": "string", "description": "The comparison operator the evaluation process must use when it compares the given user attribute's value with the comparison value." }], "type": "null" }, "comparisonValue": { "type": ["string", "null"], "description": "The value to compare against." }, "value": { "allOf": [{ "oneOf": [{ "type": "boolean" }, { "type": "string" }, { "type": "number", "format": "double" }] }], "description": "The value to serve when the comparison matches. It must respect the setting type. In some generated clients for strictly typed languages you may use double/float properties to handle integer values." }, "segmentComparator": { "allOf": [{ "enum": ["isIn", "isNotIn"], "type": "string", "description": "The segment comparison operator used during the evaluation process." }], "type": "null" }, "segmentId": { "type": ["string", "null"], "description": "The segment to compare against.", "format": "uuid" } } }, "description": "The targeting rule collection." }, "rolloutPercentageItems": { "type": "array", "items": { "required": ["percentage", "value"], "type": "object", "properties": { "percentage": { "type": "number", "description": "The percentage value for the rule.", "format": "int64" }, "value": { "allOf": [{ "oneOf": [{ "type": "boolean" }, { "type": "string" }, { "type": "number", "format": "double" }] }], "description": "The value to serve when the user falls in the percentage rule. It must respect the setting type. In some generated clients for strictly typed languages you may use double/float properties to handle integer values." } } }, "description": "The percentage rule collection." }, "value": { "allOf": [{ "oneOf": [{ "type": "boolean" }, { "type": "string" }, { "type": "number", "format": "double" }] }], "description": "The value to serve. It must respect the setting type. In some generated clients for strictly typed languages you may use double/float properties to handle integer values." } }, "description": "The JSON request body." } }, "required": ["settingKeyOrId", "requestBody"] },
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
    inputSchema: { "type": "object", "properties": { "settingKeyOrId": { "type": "string", "description": "The key or id of the Setting." }, "reason": { "type": "string", "description": "The reason note for the Audit Log if the Product's \"Config changes require a reason\" preference is turned on." }, "X-CONFIGCAT-SDKKEY": { "type": "string", "description": "The ConfigCat SDK Key. (https://app.configcat.com/sdkkey)" }, "requestBody": { "type": "array", "items": { "required": ["op", "path"], "type": "object", "properties": { "op": { "enum": ["unknown", "add", "remove", "replace", "move", "copy", "test"], "type": "string" }, "path": { "minLength": 1, "type": "string", "description": "The source path." }, "from": { "type": ["string", "null"], "description": "The target path." }, "value": { "description": "The discrete value.", "type": "null" } } }, "description": "The JSON request body." } }, "required": ["settingKeyOrId", "requestBody"] },
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
    inputSchema: { "type": "object", "properties": { "environmentId": { "type": "string", "format": "uuid", "description": "The identifier of the Environment." }, "settingId": { "type": "number", "format": "int32", "description": "The id of the Setting." } }, "required": ["environmentId", "settingId"] },
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
    inputSchema: { "type": "object", "properties": { "environmentId": { "type": "string", "format": "uuid", "description": "The identifier of the Environment." }, "settingId": { "type": "number", "format": "int32", "description": "The id of the Setting." }, "reason": { "type": "string", "description": "The reason note for the Audit Log if the Product's \"Config changes require a reason\" preference is turned on." }, "requestBody": { "required": ["value"], "type": "object", "properties": { "rolloutRules": { "type": "array", "items": { "required": ["value"], "type": "object", "properties": { "comparisonAttribute": { "maxLength": 1000, "minLength": 0, "type": ["string", "null"], "description": "The user attribute to compare." }, "comparator": { "allOf": [{ "enum": ["isOneOf", "isNotOneOf", "contains", "doesNotContain", "semVerIsOneOf", "semVerIsNotOneOf", "semVerLess", "semVerLessOrEquals", "semVerGreater", "semVerGreaterOrEquals", "numberEquals", "numberDoesNotEqual", "numberLess", "numberLessOrEquals", "numberGreater", "numberGreaterOrEquals", "sensitiveIsOneOf", "sensitiveIsNotOneOf"], "type": "string", "description": "The comparison operator the evaluation process must use when it compares the given user attribute's value with the comparison value." }], "type": "null" }, "comparisonValue": { "type": ["string", "null"], "description": "The value to compare against." }, "value": { "allOf": [{ "oneOf": [{ "type": "boolean" }, { "type": "string" }, { "type": "number", "format": "double" }] }], "description": "The value to serve when the comparison matches. It must respect the setting type. In some generated clients for strictly typed languages you may use double/float properties to handle integer values." }, "segmentComparator": { "allOf": [{ "enum": ["isIn", "isNotIn"], "type": "string", "description": "The segment comparison operator used during the evaluation process." }], "type": "null" }, "segmentId": { "type": ["string", "null"], "description": "The segment to compare against.", "format": "uuid" } } }, "description": "The targeting rule collection." }, "rolloutPercentageItems": { "type": "array", "items": { "required": ["percentage", "value"], "type": "object", "properties": { "percentage": { "type": "number", "description": "The percentage value for the rule.", "format": "int64" }, "value": { "allOf": [{ "oneOf": [{ "type": "boolean" }, { "type": "string" }, { "type": "number", "format": "double" }] }], "description": "The value to serve when the user falls in the percentage rule. It must respect the setting type. In some generated clients for strictly typed languages you may use double/float properties to handle integer values." } } }, "description": "The percentage rule collection." }, "value": { "allOf": [{ "oneOf": [{ "type": "boolean" }, { "type": "string" }, { "type": "number", "format": "double" }] }], "description": "The value to serve. It must respect the setting type. In some generated clients for strictly typed languages you may use double/float properties to handle integer values." } }, "description": "The JSON request body." } }, "required": ["environmentId", "settingId", "requestBody"] },
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
    inputSchema: { "type": "object", "properties": { "environmentId": { "type": "string", "format": "uuid", "description": "The identifier of the Environment." }, "settingId": { "type": "number", "format": "int32", "description": "The id of the Setting." }, "reason": { "type": "string", "description": "The reason note for the Audit Log if the Product's \"Config changes require a reason\" preference is turned on." }, "requestBody": { "type": "array", "items": { "required": ["op", "path"], "type": "object", "properties": { "op": { "enum": ["unknown", "add", "remove", "replace", "move", "copy", "test"], "type": "string" }, "path": { "minLength": 1, "type": "string", "description": "The source path." }, "from": { "type": ["string", "null"], "description": "The target path." }, "value": { "description": "The discrete value.", "type": "null" } } }, "description": "The JSON request body." } }, "required": ["environmentId", "settingId", "requestBody"] },
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
    inputSchema: { "type": "object", "properties": { "settingKeyOrId": { "type": "string", "description": "The key or id of the Setting." }, "X-CONFIGCAT-SDKKEY": { "type": "string", "description": "The ConfigCat SDK Key. (https://app.configcat.com/sdkkey)" } }, "required": ["settingKeyOrId"] },
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
    inputSchema: { "type": "object", "properties": { "settingKeyOrId": { "type": "string", "description": "The key or id of the Setting." }, "reason": { "type": "string", "description": "The reason note for the Audit Log if the Product's \"Config changes require a reason\" preference is turned on." }, "X-CONFIGCAT-SDKKEY": { "type": "string", "description": "The ConfigCat SDK Key. (https://app.configcat.com/sdkkey)" }, "requestBody": { "required": ["defaultValue"], "type": "object", "properties": { "defaultValue": { "type": "object", "properties": { "boolValue": { "type": ["boolean", "null"], "description": "The served value in case of a boolean Feature Flag." }, "stringValue": { "type": ["string", "null"], "description": "The served value in case of a text Setting." }, "intValue": { "type": ["number", "null"], "description": "The served value in case of a whole number Setting.", "format": "int32" }, "doubleValue": { "type": ["number", "null"], "description": "The served value in case of a decimal number Setting.", "format": "double" } }, "description": "Represents the value of a Feature Flag or Setting." }, "targetingRules": { "type": ["array", "null"], "items": { "type": "object", "properties": { "conditions": { "type": "array", "items": { "type": "object", "properties": { "userCondition": { "allOf": [{ "required": ["comparator", "comparisonAttribute", "comparisonValue"], "type": "object", "properties": { "comparisonAttribute": { "maxLength": 1000, "minLength": 1, "type": "string", "description": "The User Object attribute that the condition is based on. Can be \"User ID\", \"Email\", \"Country\" or any custom attribute." }, "comparator": { "enum": ["isOneOf", "isNotOneOf", "containsAnyOf", "doesNotContainAnyOf", "semVerIsOneOf", "semVerIsNotOneOf", "semVerLess", "semVerLessOrEquals", "semVerGreater", "semVerGreaterOrEquals", "numberEquals", "numberDoesNotEqual", "numberLess", "numberLessOrEquals", "numberGreater", "numberGreaterOrEquals", "sensitiveIsOneOf", "sensitiveIsNotOneOf", "dateTimeBefore", "dateTimeAfter", "sensitiveTextEquals", "sensitiveTextDoesNotEqual", "sensitiveTextStartsWithAnyOf", "sensitiveTextNotStartsWithAnyOf", "sensitiveTextEndsWithAnyOf", "sensitiveTextNotEndsWithAnyOf", "sensitiveArrayContainsAnyOf", "sensitiveArrayDoesNotContainAnyOf", "textEquals", "textDoesNotEqual", "textStartsWithAnyOf", "textNotStartsWithAnyOf", "textEndsWithAnyOf", "textNotEndsWithAnyOf", "arrayContainsAnyOf", "arrayDoesNotContainAnyOf"], "type": "string", "description": "The comparison operator which defines the relation between the comparison attribute and the comparison value." }, "comparisonValue": { "type": "object", "properties": { "stringValue": { "type": "string", "description": "The string representation of the comparison value.", "nullable": true }, "doubleValue": { "type": "number", "description": "The number representation of the comparison value.", "format": "double", "nullable": true }, "listValue": { "type": "array", "items": { "required": ["value"], "type": "object", "properties": { "value": { "type": "string", "description": "The actual comparison value." }, "hint": { "maxLength": 1500, "minLength": 0, "type": "string", "description": "An optional hint for the comparison value.", "nullable": true } } }, "description": "The list representation of the comparison value.", "nullable": true } }, "description": "The value that the user object's attribute is compared to." } }, "description": "Describes a condition that is based on user attributes." }], "nullable": true }, "segmentCondition": { "allOf": [{ "required": ["comparator", "segmentId"], "type": "object", "properties": { "segmentId": { "type": "string", "description": "The segment's identifier.", "format": "uuid" }, "comparator": { "enum": ["isIn", "isNotIn"], "type": "string", "description": "The segment comparison operator used during the evaluation process." } }, "description": "Describes a condition that is based on a segment." }], "nullable": true }, "prerequisiteFlagCondition": { "allOf": [{ "required": ["comparator", "prerequisiteComparisonValue", "prerequisiteSettingId"], "type": "object", "properties": { "prerequisiteSettingId": { "type": "integer", "description": "The prerequisite flag's identifier.", "format": "int32" }, "comparator": { "enum": ["equals", "doesNotEqual"], "type": "string", "description": "Prerequisite flag comparison operator used during the evaluation process." }, "prerequisiteComparisonValue": { "type": "object", "properties": { "boolValue": { "type": "boolean", "description": "The served value in case of a boolean Feature Flag.", "nullable": true }, "stringValue": { "type": "string", "description": "The served value in case of a text Setting.", "nullable": true }, "intValue": { "type": "integer", "description": "The served value in case of a whole number Setting.", "format": "int32", "nullable": true }, "doubleValue": { "type": "number", "description": "The served value in case of a decimal number Setting.", "format": "double", "nullable": true } }, "description": "Represents the value of a Feature Flag or Setting." } }, "description": "Describes a condition that is based on a prerequisite flag." }], "nullable": true } } }, "description": "The list of conditions that are combined with logical AND operators.\nIt can be one of the following:\n- User condition\n- Segment condition\n- Prerequisite flag condition", "nullable": true }, "percentageOptions": { "type": "array", "items": { "required": ["percentage", "value"], "type": "object", "properties": { "percentage": { "type": "integer", "description": "A number between 0 and 100 that represents a randomly allocated fraction of the users.", "format": "int32" }, "value": { "type": "object", "properties": { "boolValue": { "type": "boolean", "description": "The served value in case of a boolean Feature Flag.", "nullable": true }, "stringValue": { "type": "string", "description": "The served value in case of a text Setting.", "nullable": true }, "intValue": { "type": "integer", "description": "The served value in case of a whole number Setting.", "format": "int32", "nullable": true }, "doubleValue": { "type": "number", "description": "The served value in case of a decimal number Setting.", "format": "double", "nullable": true } }, "description": "Represents the value of a Feature Flag or Setting." } } }, "description": "The percentage options from where the evaluation process will choose a value based on the flag's percentage evaluation attribute.", "nullable": true }, "value": { "allOf": [{ "type": "object", "properties": { "boolValue": { "type": "boolean", "description": "The served value in case of a boolean Feature Flag.", "nullable": true }, "stringValue": { "type": "string", "description": "The served value in case of a text Setting.", "nullable": true }, "intValue": { "type": "integer", "description": "The served value in case of a whole number Setting.", "format": "int32", "nullable": true }, "doubleValue": { "type": "number", "description": "The served value in case of a decimal number Setting.", "format": "double", "nullable": true } }, "description": "Represents the value of a Feature Flag or Setting." }], "nullable": true } } }, "description": "The targeting rules of the Feature Flag or Setting." }, "percentageEvaluationAttribute": { "maxLength": 1000, "type": ["string", "null"], "description": "The user attribute used for percentage evaluation. If not set, it defaults to the `Identifier` user object attribute." } }, "description": "The JSON request body." } }, "required": ["settingKeyOrId", "requestBody"] },
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
    inputSchema: { "type": "object", "properties": { "settingKeyOrId": { "type": "string", "description": "The key or id of the Setting." }, "reason": { "type": "string", "description": "The reason note for the Audit Log if the Product's \"Config changes require a reason\" preference is turned on." }, "X-CONFIGCAT-SDKKEY": { "type": "string", "description": "The ConfigCat SDK Key. (https://app.configcat.com/sdkkey)" }, "requestBody": { "type": "array", "items": { "required": ["op", "path"], "type": "object", "properties": { "op": { "enum": ["unknown", "add", "remove", "replace", "move", "copy", "test"], "type": "string" }, "path": { "minLength": 1, "type": "string", "description": "The source path." }, "from": { "type": ["string", "null"], "description": "The target path." }, "value": { "description": "The discrete value.", "type": "null" } } }, "description": "The JSON request body." } }, "required": ["settingKeyOrId", "requestBody"] },
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
    inputSchema: { "type": "object", "properties": { "environmentId": { "type": "string", "format": "uuid", "description": "The identifier of the Environment." }, "settingId": { "type": "number", "format": "int32", "description": "The id of the Setting." } }, "required": ["environmentId", "settingId"] },
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
    inputSchema: { "type": "object", "properties": { "environmentId": { "type": "string", "format": "uuid", "description": "The identifier of the Environment." }, "settingId": { "type": "number", "format": "int32", "description": "The id of the Setting." }, "reason": { "type": "string", "description": "The reason note for the Audit Log if the Product's \"Config changes require a reason\" preference is turned on." }, "requestBody": { "required": ["defaultValue"], "type": "object", "properties": { "defaultValue": { "type": "object", "properties": { "boolValue": { "type": ["boolean", "null"], "description": "The served value in case of a boolean Feature Flag." }, "stringValue": { "type": ["string", "null"], "description": "The served value in case of a text Setting." }, "intValue": { "type": ["number", "null"], "description": "The served value in case of a whole number Setting.", "format": "int32" }, "doubleValue": { "type": ["number", "null"], "description": "The served value in case of a decimal number Setting.", "format": "double" } }, "description": "Represents the value of a Feature Flag or Setting." }, "targetingRules": { "type": ["array", "null"], "items": { "type": "object", "properties": { "conditions": { "type": "array", "items": { "type": "object", "properties": { "userCondition": { "allOf": [{ "required": ["comparator", "comparisonAttribute", "comparisonValue"], "type": "object", "properties": { "comparisonAttribute": { "maxLength": 1000, "minLength": 1, "type": "string", "description": "The User Object attribute that the condition is based on. Can be \"User ID\", \"Email\", \"Country\" or any custom attribute." }, "comparator": { "enum": ["isOneOf", "isNotOneOf", "containsAnyOf", "doesNotContainAnyOf", "semVerIsOneOf", "semVerIsNotOneOf", "semVerLess", "semVerLessOrEquals", "semVerGreater", "semVerGreaterOrEquals", "numberEquals", "numberDoesNotEqual", "numberLess", "numberLessOrEquals", "numberGreater", "numberGreaterOrEquals", "sensitiveIsOneOf", "sensitiveIsNotOneOf", "dateTimeBefore", "dateTimeAfter", "sensitiveTextEquals", "sensitiveTextDoesNotEqual", "sensitiveTextStartsWithAnyOf", "sensitiveTextNotStartsWithAnyOf", "sensitiveTextEndsWithAnyOf", "sensitiveTextNotEndsWithAnyOf", "sensitiveArrayContainsAnyOf", "sensitiveArrayDoesNotContainAnyOf", "textEquals", "textDoesNotEqual", "textStartsWithAnyOf", "textNotStartsWithAnyOf", "textEndsWithAnyOf", "textNotEndsWithAnyOf", "arrayContainsAnyOf", "arrayDoesNotContainAnyOf"], "type": "string", "description": "The comparison operator which defines the relation between the comparison attribute and the comparison value." }, "comparisonValue": { "type": "object", "properties": { "stringValue": { "type": "string", "description": "The string representation of the comparison value.", "nullable": true }, "doubleValue": { "type": "number", "description": "The number representation of the comparison value.", "format": "double", "nullable": true }, "listValue": { "type": "array", "items": { "required": ["value"], "type": "object", "properties": { "value": { "type": "string", "description": "The actual comparison value." }, "hint": { "maxLength": 1500, "minLength": 0, "type": "string", "description": "An optional hint for the comparison value.", "nullable": true } } }, "description": "The list representation of the comparison value.", "nullable": true } }, "description": "The value that the user object's attribute is compared to." } }, "description": "Describes a condition that is based on user attributes." }], "nullable": true }, "segmentCondition": { "allOf": [{ "required": ["comparator", "segmentId"], "type": "object", "properties": { "segmentId": { "type": "string", "description": "The segment's identifier.", "format": "uuid" }, "comparator": { "enum": ["isIn", "isNotIn"], "type": "string", "description": "The segment comparison operator used during the evaluation process." } }, "description": "Describes a condition that is based on a segment." }], "nullable": true }, "prerequisiteFlagCondition": { "allOf": [{ "required": ["comparator", "prerequisiteComparisonValue", "prerequisiteSettingId"], "type": "object", "properties": { "prerequisiteSettingId": { "type": "integer", "description": "The prerequisite flag's identifier.", "format": "int32" }, "comparator": { "enum": ["equals", "doesNotEqual"], "type": "string", "description": "Prerequisite flag comparison operator used during the evaluation process." }, "prerequisiteComparisonValue": { "type": "object", "properties": { "boolValue": { "type": "boolean", "description": "The served value in case of a boolean Feature Flag.", "nullable": true }, "stringValue": { "type": "string", "description": "The served value in case of a text Setting.", "nullable": true }, "intValue": { "type": "integer", "description": "The served value in case of a whole number Setting.", "format": "int32", "nullable": true }, "doubleValue": { "type": "number", "description": "The served value in case of a decimal number Setting.", "format": "double", "nullable": true } }, "description": "Represents the value of a Feature Flag or Setting." } }, "description": "Describes a condition that is based on a prerequisite flag." }], "nullable": true } } }, "description": "The list of conditions that are combined with logical AND operators.\nIt can be one of the following:\n- User condition\n- Segment condition\n- Prerequisite flag condition", "nullable": true }, "percentageOptions": { "type": "array", "items": { "required": ["percentage", "value"], "type": "object", "properties": { "percentage": { "type": "integer", "description": "A number between 0 and 100 that represents a randomly allocated fraction of the users.", "format": "int32" }, "value": { "type": "object", "properties": { "boolValue": { "type": "boolean", "description": "The served value in case of a boolean Feature Flag.", "nullable": true }, "stringValue": { "type": "string", "description": "The served value in case of a text Setting.", "nullable": true }, "intValue": { "type": "integer", "description": "The served value in case of a whole number Setting.", "format": "int32", "nullable": true }, "doubleValue": { "type": "number", "description": "The served value in case of a decimal number Setting.", "format": "double", "nullable": true } }, "description": "Represents the value of a Feature Flag or Setting." } } }, "description": "The percentage options from where the evaluation process will choose a value based on the flag's percentage evaluation attribute.", "nullable": true }, "value": { "allOf": [{ "type": "object", "properties": { "boolValue": { "type": "boolean", "description": "The served value in case of a boolean Feature Flag.", "nullable": true }, "stringValue": { "type": "string", "description": "The served value in case of a text Setting.", "nullable": true }, "intValue": { "type": "integer", "description": "The served value in case of a whole number Setting.", "format": "int32", "nullable": true }, "doubleValue": { "type": "number", "description": "The served value in case of a decimal number Setting.", "format": "double", "nullable": true } }, "description": "Represents the value of a Feature Flag or Setting." }], "nullable": true } } }, "description": "The targeting rules of the Feature Flag or Setting." }, "percentageEvaluationAttribute": { "maxLength": 1000, "type": ["string", "null"], "description": "The user attribute used for percentage evaluation. If not set, it defaults to the `Identifier` user object attribute." } }, "description": "The JSON request body." } }, "required": ["environmentId", "settingId", "requestBody"] },
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
    inputSchema: { "type": "object", "properties": { "environmentId": { "type": "string", "format": "uuid", "description": "The identifier of the Environment." }, "settingId": { "type": "number", "format": "int32", "description": "The id of the Setting." }, "reason": { "type": "string", "description": "The reason note for the Audit Log if the Product's \"Config changes require a reason\" preference is turned on." }, "requestBody": { "type": "array", "items": { "required": ["op", "path"], "type": "object", "properties": { "op": { "enum": ["unknown", "add", "remove", "replace", "move", "copy", "test"], "type": "string" }, "path": { "minLength": 1, "type": "string", "description": "The source path." }, "from": { "type": ["string", "null"], "description": "The target path." }, "value": { "description": "The discrete value.", "type": "null" } } }, "description": "The JSON request body." } }, "required": ["environmentId", "settingId", "requestBody"] },
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
    inputSchema: { "type": "object", "properties": { "configId": { "type": "string", "format": "uuid", "description": "The identifier of the Config." }, "environmentId": { "type": "string", "format": "uuid", "description": "The identifier of the Environment." } }, "required": ["configId", "environmentId"] },
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
    inputSchema: { "type": "object", "properties": { "configId": { "type": "string", "format": "uuid", "description": "The identifier of the Config." }, "environmentId": { "type": "string", "format": "uuid", "description": "The identifier of the Environment." }, "reason": { "type": "string", "description": "The reason note for the Audit Log if the Product's \"Config changes require a reason\" preference is turned on." }, "requestBody": { "type": "object", "properties": { "settingValues": { "type": "array", "items": { "required": ["value"], "type": "object", "properties": { "rolloutRules": { "type": "array", "items": { "required": ["value"], "type": "object", "properties": { "comparisonAttribute": { "maxLength": 1000, "minLength": 0, "type": ["string", "null"], "description": "The user attribute to compare." }, "comparator": { "allOf": [{ "enum": ["isOneOf", "isNotOneOf", "contains", "doesNotContain", "semVerIsOneOf", "semVerIsNotOneOf", "semVerLess", "semVerLessOrEquals", "semVerGreater", "semVerGreaterOrEquals", "numberEquals", "numberDoesNotEqual", "numberLess", "numberLessOrEquals", "numberGreater", "numberGreaterOrEquals", "sensitiveIsOneOf", "sensitiveIsNotOneOf"], "type": "string", "description": "The comparison operator the evaluation process must use when it compares the given user attribute's value with the comparison value." }], "type": "null" }, "comparisonValue": { "type": ["string", "null"], "description": "The value to compare against." }, "value": { "allOf": [{ "oneOf": [{ "type": "boolean" }, { "type": "string" }, { "type": "number", "format": "double" }] }], "description": "The value to serve when the comparison matches. It must respect the setting type. In some generated clients for strictly typed languages you may use double/float properties to handle integer values." }, "segmentComparator": { "allOf": [{ "enum": ["isIn", "isNotIn"], "type": "string", "description": "The segment comparison operator used during the evaluation process." }], "type": "null" }, "segmentId": { "type": ["string", "null"], "description": "The segment to compare against.", "format": "uuid" } } }, "description": "The targeting rule collection." }, "rolloutPercentageItems": { "type": "array", "items": { "required": ["percentage", "value"], "type": "object", "properties": { "percentage": { "type": "number", "description": "The percentage value for the rule.", "format": "int64" }, "value": { "allOf": [{ "oneOf": [{ "type": "boolean" }, { "type": "string" }, { "type": "number", "format": "double" }] }], "description": "The value to serve when the user falls in the percentage rule. It must respect the setting type. In some generated clients for strictly typed languages you may use double/float properties to handle integer values." } } }, "description": "The percentage rule collection." }, "value": { "allOf": [{ "oneOf": [{ "type": "boolean" }, { "type": "string" }, { "type": "number", "format": "double" }] }], "description": "The value to serve. It must respect the setting type. In some generated clients for strictly typed languages you may use double/float properties to handle integer values." }, "settingId": { "type": "number", "description": "The id of the Setting.", "format": "int32" } } }, "description": "The values to update." } }, "description": "The JSON request body." } }, "required": ["configId", "environmentId", "requestBody"] },
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
    inputSchema: { "type": "object", "properties": { "configId": { "type": "string", "format": "uuid", "description": "The identifier of the Config." }, "environmentId": { "type": "string", "format": "uuid", "description": "The identifier of the Environment." } }, "required": ["configId", "environmentId"] },
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
    inputSchema: { "type": "object", "properties": { "configId": { "type": "string", "format": "uuid", "description": "The identifier of the Config." }, "environmentId": { "type": "string", "format": "uuid", "description": "The identifier of the Environment." }, "reason": { "type": "string", "description": "The reason note for the Audit Log if the Product's \"Config changes require a reason\" preference is turned on." }, "requestBody": { "type": "object", "properties": { "updateFormulas": { "type": "array", "items": { "required": ["defaultValue"], "type": "object", "properties": { "defaultValue": { "type": "object", "properties": { "boolValue": { "type": ["boolean", "null"], "description": "The served value in case of a boolean Feature Flag." }, "stringValue": { "type": ["string", "null"], "description": "The served value in case of a text Setting." }, "intValue": { "type": ["number", "null"], "description": "The served value in case of a whole number Setting.", "format": "int32" }, "doubleValue": { "type": ["number", "null"], "description": "The served value in case of a decimal number Setting.", "format": "double" } }, "description": "Represents the value of a Feature Flag or Setting." }, "targetingRules": { "type": ["array", "null"], "items": { "type": "object", "properties": { "conditions": { "type": "array", "items": { "type": "object", "properties": { "userCondition": { "allOf": [{ "required": ["comparator", "comparisonAttribute", "comparisonValue"], "type": "object", "properties": { "comparisonAttribute": { "maxLength": 1000, "minLength": 1, "type": "string", "description": "The User Object attribute that the condition is based on. Can be \"User ID\", \"Email\", \"Country\" or any custom attribute." }, "comparator": { "enum": ["isOneOf", "isNotOneOf", "containsAnyOf", "doesNotContainAnyOf", "semVerIsOneOf", "semVerIsNotOneOf", "semVerLess", "semVerLessOrEquals", "semVerGreater", "semVerGreaterOrEquals", "numberEquals", "numberDoesNotEqual", "numberLess", "numberLessOrEquals", "numberGreater", "numberGreaterOrEquals", "sensitiveIsOneOf", "sensitiveIsNotOneOf", "dateTimeBefore", "dateTimeAfter", "sensitiveTextEquals", "sensitiveTextDoesNotEqual", "sensitiveTextStartsWithAnyOf", "sensitiveTextNotStartsWithAnyOf", "sensitiveTextEndsWithAnyOf", "sensitiveTextNotEndsWithAnyOf", "sensitiveArrayContainsAnyOf", "sensitiveArrayDoesNotContainAnyOf", "textEquals", "textDoesNotEqual", "textStartsWithAnyOf", "textNotStartsWithAnyOf", "textEndsWithAnyOf", "textNotEndsWithAnyOf", "arrayContainsAnyOf", "arrayDoesNotContainAnyOf"], "type": "string", "description": "The comparison operator which defines the relation between the comparison attribute and the comparison value." }, "comparisonValue": { "type": "object", "properties": { "stringValue": { "type": "string", "description": "The string representation of the comparison value.", "nullable": true }, "doubleValue": { "type": "number", "description": "The number representation of the comparison value.", "format": "double", "nullable": true }, "listValue": { "type": "array", "items": { "required": ["value"], "type": "object", "properties": { "value": { "type": "string", "description": "The actual comparison value." }, "hint": { "maxLength": 1500, "minLength": 0, "type": "string", "description": "An optional hint for the comparison value.", "nullable": true } } }, "description": "The list representation of the comparison value.", "nullable": true } }, "description": "The value that the user object's attribute is compared to." } }, "description": "Describes a condition that is based on user attributes." }], "nullable": true }, "segmentCondition": { "allOf": [{ "required": ["comparator", "segmentId"], "type": "object", "properties": { "segmentId": { "type": "string", "description": "The segment's identifier.", "format": "uuid" }, "comparator": { "enum": ["isIn", "isNotIn"], "type": "string", "description": "The segment comparison operator used during the evaluation process." } }, "description": "Describes a condition that is based on a segment." }], "nullable": true }, "prerequisiteFlagCondition": { "allOf": [{ "required": ["comparator", "prerequisiteComparisonValue", "prerequisiteSettingId"], "type": "object", "properties": { "prerequisiteSettingId": { "type": "integer", "description": "The prerequisite flag's identifier.", "format": "int32" }, "comparator": { "enum": ["equals", "doesNotEqual"], "type": "string", "description": "Prerequisite flag comparison operator used during the evaluation process." }, "prerequisiteComparisonValue": { "type": "object", "properties": { "boolValue": { "type": "boolean", "description": "The served value in case of a boolean Feature Flag.", "nullable": true }, "stringValue": { "type": "string", "description": "The served value in case of a text Setting.", "nullable": true }, "intValue": { "type": "integer", "description": "The served value in case of a whole number Setting.", "format": "int32", "nullable": true }, "doubleValue": { "type": "number", "description": "The served value in case of a decimal number Setting.", "format": "double", "nullable": true } }, "description": "Represents the value of a Feature Flag or Setting." } }, "description": "Describes a condition that is based on a prerequisite flag." }], "nullable": true } } }, "description": "The list of conditions that are combined with logical AND operators.\nIt can be one of the following:\n- User condition\n- Segment condition\n- Prerequisite flag condition", "nullable": true }, "percentageOptions": { "type": "array", "items": { "required": ["percentage", "value"], "type": "object", "properties": { "percentage": { "type": "integer", "description": "A number between 0 and 100 that represents a randomly allocated fraction of the users.", "format": "int32" }, "value": { "type": "object", "properties": { "boolValue": { "type": "boolean", "description": "The served value in case of a boolean Feature Flag.", "nullable": true }, "stringValue": { "type": "string", "description": "The served value in case of a text Setting.", "nullable": true }, "intValue": { "type": "integer", "description": "The served value in case of a whole number Setting.", "format": "int32", "nullable": true }, "doubleValue": { "type": "number", "description": "The served value in case of a decimal number Setting.", "format": "double", "nullable": true } }, "description": "Represents the value of a Feature Flag or Setting." } } }, "description": "The percentage options from where the evaluation process will choose a value based on the flag's percentage evaluation attribute.", "nullable": true }, "value": { "allOf": [{ "type": "object", "properties": { "boolValue": { "type": "boolean", "description": "The served value in case of a boolean Feature Flag.", "nullable": true }, "stringValue": { "type": "string", "description": "The served value in case of a text Setting.", "nullable": true }, "intValue": { "type": "integer", "description": "The served value in case of a whole number Setting.", "format": "int32", "nullable": true }, "doubleValue": { "type": "number", "description": "The served value in case of a decimal number Setting.", "format": "double", "nullable": true } }, "description": "Represents the value of a Feature Flag or Setting." }], "nullable": true } } }, "description": "The targeting rules of the Feature Flag or Setting." }, "percentageEvaluationAttribute": { "maxLength": 1000, "type": ["string", "null"], "description": "The user attribute used for percentage evaluation. If not set, it defaults to the `Identifier` user object attribute." }, "settingId": { "type": "number", "description": "The identifier of the feature flag or setting.", "format": "int32" } } }, "description": "Evaluation descriptors of each updated Feature Flag and Setting." } }, "description": "The JSON request body." } }, "required": ["configId", "environmentId", "requestBody"] },
    method: "post",
    pathTemplate: "/v2/configs/{configId}/environments/{environmentId}/values",
    executionParameters: [{ "name": "configId", "in": "path" }, { "name": "environmentId", "in": "path" }, { "name": "reason", "in": "query" }],
  }],
  ["get-tag", {
    name: "get-tag",
    description: `This endpoint returns the metadata of a Tag 
identified by the \`tagId\`.`,
    inputSchema: { "type": "object", "properties": { "tagId": { "type": "number", "format": "int64", "description": "The identifier of the Tag." } }, "required": ["tagId"] },
    method: "get",
    pathTemplate: "/v1/tags/{tagId}",
    executionParameters: [{ "name": "tagId", "in": "path" }],
  }],
  ["update-tag", {
    name: "update-tag",
    description: "This endpoint updates a Tag identified by the `tagId` parameter.",
    inputSchema: { "type": "object", "properties": { "tagId": { "type": "number", "format": "int64", "description": "The identifier of the Tag." }, "requestBody": { "type": "object", "properties": { "name": { "maxLength": 255, "minLength": 0, "type": ["string", "null"], "description": "Name of the Tag." }, "color": { "maxLength": 255, "minLength": 0, "type": ["string", "null"], "description": "Color of the Tag. Possible values: `panther`, `whale`, `salmon`, `lizard`, `canary`, `koala`, or any HTML color code." } }, "description": "The JSON request body." } }, "required": ["tagId", "requestBody"] },
    method: "put",
    pathTemplate: "/v1/tags/{tagId}",
    executionParameters: [{ "name": "tagId", "in": "path" }],
  }],
  ["delete-tag", {
    name: "delete-tag",
    description: "This endpoint deletes a Tag identified by the `tagId` parameter. To remove a Tag from a Feature Flag or Setting use the [Update Flag](#operation/update-setting) endpoint.",
    inputSchema: { "type": "object", "properties": { "tagId": { "type": "number", "format": "int64", "description": "The identifier of the Tag." } }, "required": ["tagId"] },
    method: "delete",
    pathTemplate: "/v1/tags/{tagId}",
    executionParameters: [{ "name": "tagId", "in": "path" }],
  }],
  ["get-webhook", {
    name: "get-webhook",
    description: `This endpoint returns the metadata of a Webhook 
identified by the \`webhookId\`.`,
    inputSchema: { "type": "object", "properties": { "webhookId": { "type": "number", "format": "int32", "description": "The identifier of the Webhook." } }, "required": ["webhookId"] },
    method: "get",
    pathTemplate: "/v1/webhooks/{webhookId}",
    executionParameters: [{ "name": "webhookId", "in": "path" }],
  }],
  ["replace-webhook", {
    name: "replace-webhook",
    description: `This endpoint replaces the whole value of a Webhook identified by the \`webhookId\` parameter.

**Important:** As this endpoint is doing a complete replace, it's important to set every other attribute that you don't
want to change in its original state. Not listing one means it will reset.`,
    inputSchema: { "type": "object", "properties": { "webhookId": { "type": "number", "format": "int32", "description": "The identifier of the Webhook." }, "requestBody": { "required": ["url"], "type": "object", "properties": { "url": { "maxLength": 1000, "minLength": 7, "type": "string", "description": "The URL of the Webhook." }, "content": { "maxLength": 15000, "minLength": 0, "type": ["string", "null"], "description": "The HTTP body content." }, "httpMethod": { "allOf": [{ "enum": ["get", "post"], "type": "string" }], "type": "null" }, "webHookHeaders": { "type": ["array", "null"], "items": { "required": ["key", "value"], "type": "object", "properties": { "key": { "maxLength": 255, "minLength": 1, "type": "string", "description": "The HTTP header key." }, "value": { "maxLength": 1000, "minLength": 1, "type": "string", "description": "The HTTP header value." }, "isSecure": { "type": "boolean", "description": "Indicates whether the header value is sensitive." } } }, "description": "List of HTTP headers." } }, "description": "The JSON request body." } }, "required": ["webhookId", "requestBody"] },
    method: "put",
    pathTemplate: "/v1/webhooks/{webhookId}",
    executionParameters: [{ "name": "webhookId", "in": "path" }],
  }],
  ["delete-webhook", {
    name: "delete-webhook",
    description: "This endpoint removes a Webhook identified by the `webhookId` parameter.",
    inputSchema: { "type": "object", "properties": { "webhookId": { "type": "number", "format": "int32", "description": "The identifier of the Webhook." } }, "required": ["webhookId"] },
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
    inputSchema: { "type": "object", "properties": { "webhookId": { "type": "number", "format": "int32", "description": "The identifier of the Webhook." }, "requestBody": { "type": "array", "items": { "required": ["op", "path"], "type": "object", "properties": { "op": { "enum": ["unknown", "add", "remove", "replace", "move", "copy", "test"], "type": "string" }, "path": { "minLength": 1, "type": "string", "description": "The source path." }, "from": { "type": ["string", "null"], "description": "The target path." }, "value": { "description": "The discrete value.", "type": "null" } } }, "description": "The JSON request body." } }, "required": ["webhookId", "requestBody"] },
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
    inputSchema: { "type": "object", "properties": { "webhookId": { "type": "number", "format": "int32", "description": "The identifier of the Webhook." } }, "required": ["webhookId"] },
    method: "get",
    pathTemplate: "/v1/webhooks/{webhookId}/keys",
    executionParameters: [{ "name": "webhookId", "in": "path" }],
  }],
  ["add-or-update-integration-link", {
    name: "add-or-update-integration-link",
    description: "Add or update Integration link",
    inputSchema: { "type": "object", "properties": { "environmentId": { "type": "string", "format": "uuid", "description": "The identifier of the Environment." }, "settingId": { "type": "number", "format": "int32", "description": "The id of the Setting." }, "integrationLinkType": { "enum": ["trello", "jira", "monday"], "type": "string", "description": "The integration link's type." }, "key": { "type": "string", "description": "The key of the integration link." }, "requestBody": { "type": "object", "properties": { "description": { "maxLength": 1000, "type": ["string", "null"] }, "url": { "maxLength": 1000, "type": ["string", "null"] } }, "description": "The JSON request body." } }, "required": ["environmentId", "settingId", "integrationLinkType", "key"] },
    method: "post",
    pathTemplate: "/v1/environments/{environmentId}/settings/{settingId}/integrationLinks/{integrationLinkType}/{key}",
    executionParameters: [{ "name": "environmentId", "in": "path" }, { "name": "settingId", "in": "path" }, { "name": "integrationLinkType", "in": "path" }, { "name": "key", "in": "path" }],
  }],
  ["delete-integration-link", {
    name: "delete-integration-link",
    description: "Delete Integration link",
    inputSchema: { "type": "object", "properties": { "environmentId": { "type": "string", "format": "uuid", "description": "The identifier of the Environment." }, "settingId": { "type": "number", "format": "int32", "description": "The id of the Setting." }, "integrationLinkType": { "enum": ["trello", "jira", "monday"], "type": "string", "description": "The integration's type." }, "key": { "type": "string", "description": "The key of the integration link." } }, "required": ["environmentId", "settingId", "integrationLinkType", "key"] },
    method: "delete",
    pathTemplate: "/v1/environments/{environmentId}/settings/{settingId}/integrationLinks/{integrationLinkType}/{key}",
    executionParameters: [{ "name": "environmentId", "in": "path" }, { "name": "settingId", "in": "path" }, { "name": "integrationLinkType", "in": "path" }, { "name": "key", "in": "path" }],
  }],
  ["jira-add-or-update-integration-link", {
    name: "jira-add-or-update-integration-link",
    description: "Executes POST /v1/jira/environments/{environmentId}/settings/{settingId}/integrationLinks/{key}",
    inputSchema: { "type": "object", "properties": { "environmentId": { "type": "string", "format": "uuid", "description": "The identifier of the Environment." }, "settingId": { "type": "number", "format": "int32", "description": "The id of the Setting." }, "key": { "type": "string", "description": "The key of the integration link." }, "requestBody": { "required": ["clientKey", "jiraJwtToken"], "type": "object", "properties": { "jiraJwtToken": { "maxLength": 15000, "minLength": 0, "type": "string" }, "clientKey": { "maxLength": 255, "minLength": 0, "type": "string" }, "description": { "maxLength": 1000, "minLength": 0, "type": ["string", "null"] }, "url": { "maxLength": 1000, "minLength": 0, "type": ["string", "null"] } }, "description": "The JSON request body." } }, "required": ["environmentId", "settingId", "key"] },
    method: "post",
    pathTemplate: "/v1/jira/environments/{environmentId}/settings/{settingId}/integrationLinks/{key}",
    executionParameters: [{ "name": "environmentId", "in": "path" }, { "name": "settingId", "in": "path" }, { "name": "key", "in": "path" }],
  }],
  ["jira-connect", {
    name: "jira-connect",
    description: "Executes POST /v1/jira/connect",
    inputSchema: { "type": "object", "properties": { "requestBody": { "required": ["clientKey", "jiraJwtToken"], "type": "object", "properties": { "clientKey": { "maxLength": 255, "minLength": 0, "type": "string" }, "jiraJwtToken": { "maxLength": 15000, "minLength": 0, "type": "string" } }, "description": "The JSON request body." } } },
    method: "post",
    pathTemplate: "/v1/jira/connect",
    executionParameters: [],
  }],
  ["create-product", {
    name: "create-product",
    description: `This endpoint creates a new Product in a specified Organization 
identified by the \`organizationId\` parameter, which can be obtained from the [List Organizations](#operation/list-organizations) endpoint.`,
    inputSchema: { "type": "object", "properties": { "organizationId": { "type": "string", "format": "uuid", "description": "The identifier of the Organization." }, "requestBody": { "required": ["name"], "type": "object", "properties": { "name": { "maxLength": 1000, "minLength": 1, "type": "string", "description": "The name of the Product." }, "description": { "maxLength": 1000, "minLength": 0, "type": ["string", "null"], "description": "The description of the Product." }, "order": { "type": ["number", "null"], "description": "The order of the Product represented on the ConfigCat Dashboard.\nDetermined from an ascending sequence of integers.", "format": "int32" } }, "description": "The JSON request body." } }, "required": ["organizationId", "requestBody"] },
    method: "post",
    pathTemplate: "/v1/organizations/{organizationId}/products",
    executionParameters: [{ "name": "organizationId", "in": "path" }],
  }],
  ["create-webhook", {
    name: "create-webhook",
    description: `This endpoint creates a new Webhook in a specified Product
identified by the \`productId\` parameter, which can be obtained from the [List Products](#operation/list-products) endpoint.`,
    inputSchema: { "type": "object", "properties": { "configId": { "type": "string", "format": "uuid", "description": "The identifier of the Config." }, "environmentId": { "type": "string", "format": "uuid", "description": "The identifier of the Environment." }, "requestBody": { "required": ["url"], "type": "object", "properties": { "url": { "maxLength": 1000, "minLength": 7, "type": "string", "description": "The URL of the Webhook." }, "content": { "maxLength": 15000, "minLength": 0, "type": ["string", "null"], "description": "The HTTP body content." }, "httpMethod": { "allOf": [{ "enum": ["get", "post"], "type": "string" }], "type": "null" }, "webHookHeaders": { "type": ["array", "null"], "items": { "required": ["key", "value"], "type": "object", "properties": { "key": { "maxLength": 255, "minLength": 1, "type": "string", "description": "The HTTP header key." }, "value": { "maxLength": 1000, "minLength": 1, "type": "string", "description": "The HTTP header value." }, "isSecure": { "type": "boolean", "description": "Indicates whether the header value is sensitive." } } }, "description": "List of HTTP headers." } }, "description": "The JSON request body." } }, "required": ["configId", "environmentId", "requestBody"] },
    method: "post",
    pathTemplate: "/v1/configs/{configId}/environments/{environmentId}/webhooks",
    executionParameters: [{ "name": "configId", "in": "path" }, { "name": "environmentId", "in": "path" }],
  }],
  ["PostV1CodeReferencesDeleteReports", {
    name: "PostV1CodeReferencesDeleteReports",
    description: "Delete Reference reports",
    inputSchema: { "type": "object", "properties": { "requestBody": { "required": ["configId", "repository"], "type": "object", "properties": { "configId": { "type": "string", "description": "The Config's identifier from where the reports should be deleted.", "format": "uuid" }, "repository": { "maxLength": 255, "minLength": 1, "type": "string", "description": "The source control repository which's reports should be deleted." }, "branch": { "maxLength": 255, "minLength": 0, "type": ["string", "null"], "description": "If it's set, only this branch's reports belonging to the given repository will be deleted." }, "settingId": { "type": ["number", "null"], "description": "If it's set, only this setting's reports belonging to the given repository will be deleted.", "format": "int32" } }, "description": "The JSON request body." } }, "required": ["requestBody"] },
    method: "post",
    pathTemplate: "/v1/code-references/delete-reports",
    executionParameters: [],
  }],
  ["invite-member", {
    name: "invite-member",
    description: "This endpoint invites a Member into the given Product identified by the `productId` parameter.",
    inputSchema: { "type": "object", "properties": { "productId": { "type": "string", "format": "uuid", "description": "The identifier of the Product." }, "requestBody": { "required": ["emails", "permissionGroupId"], "type": "object", "properties": { "emails": { "type": "array", "items": { "type": "string" }, "description": "List of email addresses to invite." }, "permissionGroupId": { "type": "number", "description": "Identifier of the Permission Group to where the invited users should be added.", "format": "int64" } }, "description": "The JSON request body." } }, "required": ["productId", "requestBody"] },
    method: "post",
    pathTemplate: "/v1/products/{productId}/members/invite",
    executionParameters: [{ "name": "productId", "in": "path" }],
  }],
  ["PostV1CodeReferences", {
    name: "PostV1CodeReferences",
    description: "Upload References",
    inputSchema: { "type": "object", "properties": { "requestBody": { "required": ["branch", "configId", "repository"], "type": "object", "properties": { "configId": { "type": "string", "description": "The Config's identifier the scanning was performed against.", "format": "uuid" }, "repository": { "maxLength": 255, "minLength": 1, "type": "string", "description": "The source control repository that contains the scanned code. (Source of the repository selector on the ConfigCat Dashboard)" }, "branch": { "maxLength": 255, "minLength": 1, "type": "string", "description": "The source control branch on where the scan was performed. (Source of the branch selector on the ConfigCat Dashboard)" }, "commitUrl": { "maxLength": 1000, "minLength": 0, "type": ["string", "null"], "description": "The related commit's URL. (Appears on the ConfigCat Dashboard)" }, "commitHash": { "maxLength": 255, "minLength": 0, "type": ["string", "null"], "description": "The related commit's hash. (Appears on the ConfigCat Dashboard)" }, "uploader": { "maxLength": 255, "minLength": 0, "type": ["string", "null"], "description": "The scanning tool's name. (Appears on the ConfigCat Dashboard)" }, "activeBranches": { "type": "array", "items": { "type": "string" }, "description": "The currently active branches of the repository. Each previously uploaded report that belongs to a non-reported active branch is being deleted." }, "flagReferences": { "type": "array", "items": { "required": ["references", "settingId"], "type": "object", "properties": { "settingId": { "type": "number", "description": "The identifier of the Feature Flag or Setting the code reference belongs to.", "format": "int32" }, "references": { "type": "array", "items": { "required": ["file", "referenceLine"], "type": "object", "properties": { "file": { "maxLength": 255, "minLength": 1, "type": "string", "description": "The file's name in where the code reference has been found. (Appears on the ConfigCat Dashboard)" }, "fileUrl": { "maxLength": 1000, "minLength": 0, "type": ["string", "null"], "description": "The file's url. (Used to point to the file on the repository's website)" }, "preLines": { "type": "array", "items": { "required": ["lineNumber"], "type": "object", "properties": { "lineText": { "maxLength": 1000, "minLength": 0, "type": ["string", "null"], "description": "The content of the reference line." }, "lineNumber": { "type": "number", "description": "The line number.", "format": "int32" } }, "description": "Determines a code reference line." }, "description": "The lines before the actual reference line." }, "postLines": { "type": "array", "items": { "required": ["lineNumber"], "type": "object", "properties": { "lineText": { "maxLength": 1000, "minLength": 0, "type": ["string", "null"], "description": "The content of the reference line." }, "lineNumber": { "type": "number", "description": "The line number.", "format": "int32" } }, "description": "Determines a code reference line." }, "description": "The lines after the actual reference line." }, "referenceLine": { "required": ["lineNumber"], "type": "object", "properties": { "lineText": { "maxLength": 1000, "minLength": 0, "type": ["string", "null"], "description": "The content of the reference line." }, "lineNumber": { "type": "number", "description": "The line number.", "format": "int32" } }, "description": "Determines a code reference line." } } }, "description": "The actual references to the given Feature Flag or Setting." } } }, "description": "The actual code reference collection." } }, "description": "The JSON request body." } }, "required": ["requestBody"] },
    method: "post",
    pathTemplate: "/v1/code-references",
    executionParameters: [],
  }],
  ["update-member-permissions", {
    name: "update-member-permissions",
    description: `This endpoint updates the permissions of a Member identified by the \`userId\`. 
This endpoint can also be used to move a Member between Permission Groups within a Product.
Only a single Permission Group can be set per Product.`,
    inputSchema: { "type": "object", "properties": { "organizationId": { "type": "string", "format": "uuid", "description": "The identifier of the Organization." }, "userId": { "type": "string", "description": "The identifier of the Member." }, "requestBody": { "type": "object", "properties": { "permissionGroupIds": { "type": ["array", "null"], "items": { "type": "integer", "format": "int64" }, "description": "List of Permission Group identifiers to where the Member should be added." }, "isAdmin": { "type": ["boolean", "null"], "description": "Indicates that the member must be Organization Admin." }, "isBillingManager": { "type": ["boolean", "null"], "description": "Indicates that the member must be Billing Manager." }, "removeFromPermissionGroupsWhereIdNotSet": { "type": "boolean", "description": "When `true`, the member will be removed from those Permission Groups that are not listed in the `permissionGroupIds` field." } }, "description": "The JSON request body." } }, "required": ["organizationId", "userId", "requestBody"] },
    method: "post",
    pathTemplate: "/v1/organizations/{organizationId}/members/{userId}",
    executionParameters: [{ "name": "organizationId", "in": "path" }, { "name": "userId", "in": "path" }],
  }],
  ["delete-organization-member", {
    name: "delete-organization-member",
    description: `This endpoint removes a Member identified by the \`userId\` from the 
given Organization identified by the \`organizationId\` parameter.`,
    inputSchema: { "type": "object", "properties": { "organizationId": { "type": "string", "format": "uuid", "description": "The identifier of the Organization." }, "userId": { "type": "string", "description": "The identifier of the Member." } }, "required": ["organizationId", "userId"] },
    method: "delete",
    pathTemplate: "/v1/organizations/{organizationId}/members/{userId}",
    executionParameters: [{ "name": "organizationId", "in": "path" }, { "name": "userId", "in": "path" }],
  }],
  ["delete-invitation", {
    name: "delete-invitation",
    description: "This endpoint removes an Invitation identified by the `invitationId` parameter.",
    inputSchema: { "type": "object", "properties": { "invitationId": { "type": "string", "format": "uuid", "description": "The identifier of the Invitation." } }, "required": ["invitationId"] },
    method: "delete",
    pathTemplate: "/v1/invitations/{invitationId}",
    executionParameters: [{ "name": "invitationId", "in": "path" }],
  }],
  ["delete-product-member", {
    name: "delete-product-member",
    description: `This endpoint removes a Member identified by the \`userId\` from the 
given Product identified by the \`productId\` parameter.`,
    inputSchema: { "type": "object", "properties": { "productId": { "type": "string", "format": "uuid", "description": "The identifier of the Product." }, "userId": { "type": "string", "description": "The identifier of the Member." } }, "required": ["productId", "userId"] },
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
) {
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    const toolsForClient: Tool[] = Array.from(toolDefinitionMap.values()).map(def => ({
      name: def.name,
      description: def.description,
      inputSchema: def.inputSchema,
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
      const zodSchema = getZodSchemaFromJsonSchema(definition.inputSchema, toolName);
      const argsToParse = (typeof toolArgs === "object" && toolArgs !== null) ? toolArgs : {};
      validatedArgs = zodSchema.parse(argsToParse);
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
    let requestBodyData: any = undefined;

    // Apply parameters to the URL path, query, or headers
    definition.executionParameters.forEach((param) => {
      const value = validatedArgs[param.name];
      if (typeof value !== "undefined" && value !== null) {
        if (param.in === "path") {
          urlPath = urlPath.replace(`{${param.name}}`, encodeURIComponent(String(value)));
        } else if (param.in === "query") {
          queryParams[param.name] = value;
        } else if (param.in === "header") {
          headers[param.name.toLowerCase()] = String(value);
        }
      }
    });

    // Ensure all path parameters are resolved
    if (urlPath.includes("{")) {
      throw new Error(`Failed to resolve path parameters: ${urlPath}`);
    }

    // Handle request body if needed
    if (typeof validatedArgs['requestBody'] !== 'undefined') {
        requestBodyData = validatedArgs['requestBody'];
    }

    const method = definition.method.toUpperCase();

    // Log request info to stderr (doesn't affect MCP output)
    console.error(`Executing tool "${toolName}": ${method} ${urlPath}`);

    // Execute the request
    const response = await http.request(urlPath, {
      method: method,
      headers: headers,
      ...(requestBodyData !== undefined && { body: JSON.stringify(requestBodyData) }),
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

/**
 * Converts a JSON Schema to a Zod schema for runtime validation
 *
 * @param jsonSchema JSON Schema
 * @param toolName Tool name for error reporting
 * @returns Zod schema
 */
function getZodSchemaFromJsonSchema(jsonSchema: JsonSchema, toolName: string): z.ZodTypeAny {
  if (typeof jsonSchema !== "object" || jsonSchema === null) {
    return z.object({}).passthrough();
  }
  try {
    const zodSchemaString = jsonSchemaToZod(jsonSchema);
    const zodSchema = eval(zodSchemaString);
    if (typeof zodSchema?.parse !== "function") {
      throw new Error("Eval did not produce a valid Zod schema.");
    }
    return zodSchema as z.ZodTypeAny;
  } catch (err: any) {
    console.error(`Failed to generate/evaluate Zod schema for '${toolName}':`, err);
    return z.object({}).passthrough();
  }
}

