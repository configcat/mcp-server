# ConfigCat MCP Server

A Model Context Protocol (MCP) server that provides access to [ConfigCat's public management API](https://api.configcat.com/docs/) for feature flag and configuration management.

## Features

- **Tools**: Complete set of tools for ConfigCat's public management API operations. You can Create, Read, Update and Delete any entities like Feature Flags, Configs, Environments or Products within ConfigCat.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Build the server:
```bash
npm run build
```

3. Set up your ConfigCat API credentials as environment variables:
```bash
export CONFIGCAT_API_USER="your-username"
export CONFIGCAT_API_PASS="your-password"
```

You can get your API credentials from your ConfigCat account management page.

## Usage

### Running the Server

```bash
npm start
```

### MCP Client Configuration

Add this server to your MCP client configuration:

```json
{
  "mcpServers": {
    "configcat": {
      "command": "node",
      "args": ["path/to/configcat-mcp/build/index.js"],
      "env": {
        "CONFIGCAT_USERNAME": "your-username",
        "CONFIGCAT_PASSWORD": "your-password"
      }
    }
  }
}
```

## Available Tools

### Organization/Membership Management

- `list-organizations` - List all organizations
- `list-organization-members` - List organization members
- `list-organization-members-v2` - List organization members (v2)
- `list-pending-invitations` - List pending invitations
- `list-pending-invitations-org` - List org pending invitations
- `list-product-members` - List product members
- `invite-member` - Invite a new member
- `update-member-permissions` - Update the permissions of a member
- `delete-organization-member` - Remove organization member
- `delete-product-member` - Remove product member
- `delete-invitation` - Cancel invitation
- `list-permission-groups` - List permission groups
- `create-permission-group` - Create a new permission group
- `get-permission-group` - Get permission group details
- `update-permission-group` - Update permission group
- `delete-permission-group` - Delete permission group

### General

- `list-products` - List all products
- `get-product` - Get specific product details
- `update-product` - Update existing product
- `delete-product` - Delete a product
- `get-product-preferences` - Get product preferences
- `update-product-preferences` - Update product preferences
- `create-product` - Create a new product

- `list-configs` - List configs for a product
- `create-config` - Create a new config
- `get-config` - Get specific config details
- `update-config` - Update existing config
- `delete-config` - Delete a config

- `list-environments` - List environments for a product
- `create-environment` - Create a new environment
- `get-environment` - Get specific environment details
- `update-environment` - Update existing environment
- `delete-environment` - Delete an environment

- `list-segments` - List user segments
- `create-segment` - Create a new segment
- `get-segment` - Get specific segment details
- `update-segment` - Update existing segment
- `delete-segment` - Delete a segment

- `get-sdk-keys` - Get SDK keys for config/environment

- `list-webhooks` - List webhooks
- `get-webhook` - Get webhook details
- `replace-webhook` - Replace webhook configuration
- `update-webhook` - Update existing webhook
- `delete-webhook` - Delete a webhook
- `get-webhook-signing-keys` - List webhook signing keys
- `create-webhook` - Create a new webhook

- `list-integrations` - List integrations
- `create-integration` - Create a new integration
- `get-integration` - Get integration details
- `update-integration` - Update existing integration
- `delete-integration` - Delete an integration

- `GetV1SettingsCodeReferences` - Get code references
- `PostV1CodeReferencesDeleteReports` - Delete Code Reference reports
- `PostV1CodeReferences` - Upload code references


### Diagnostics

- `list-auditlogs` - Get product audit logs
- `list-organization-auditlogs` - Get organization audit logs
- `list-deleted-settings` - List deleted feature flags and Settings

- `list-staleflags` - Get stale feature flags report

### Feature Flag metadata

- `list-settings` - List feature flags for a config
- `create-setting` - Create a new feature flag
- `get-setting` - Get specific feature flag details
- `replace-setting` - Replace feature flag configuration
- `update-setting` - Update existing feature flag
- `delete-setting` - Delete a feature flag

- `list-tags` - List tags for a product
- `create-tag` - Create a new tag
- `list-settings-by-tag` - Get feature flags by tag
- `get-tag` - Get specific tag details
- `update-tag` - Update existing tag
- `delete-tag` - Delete a tag

### Feature Flag Values (v1 & v2 APIs)

- `get-setting-value` - Get feature flag value
- `update-setting-value` - Update feature flag value
- `replace-setting-value` - Replace feature flag value
- `get-setting-value-by-sdkkey` - Get value by SDK key
- `update-setting-value-by-sdkkey` - Update value by SDK key
- `replace-setting-value-by-sdkkey` - Replace value by SDK key
- `get-setting-values` - Get multiple setting values
- `post-setting-values` - Update multiple setting values
- V2 variants: `*-v2` versions of above tools for Config V2

### Integration Link

- `get-integration-link-details` - Get integration link details
- `add-or-update-integration-link` - Manage integration links
- `delete-integration-link` - Delete integration link
- `jira-add-or-update-integration-link` - Manage Jira links
- `jira-connect` - Connect to Jira

### API Access

- `get-me` - Get current user details

## API Rate Limits

The ConfigCat public API has rate limits. The server will respect these limits and return appropriate error messages if limits are exceeded.

## Security Note

This server is designed for management operations only. Do not use it for evaluating feature flag values in production applications - use the ConfigCat SDKs or ConfigCat Proxy instead.

## Development

```bash
# Build and watch for changes
npm run dev

# Build for production
npm run build
```