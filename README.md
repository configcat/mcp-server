# ConfigCat MCP Server

The [ConfigCat](https://configcat.com/)'s Model Context Protocol (MCP) server provides access to [ConfigCat's public management API](https://configcat.com/docs/api/reference/configcat-public-management-api/) for feature flag and configuration management. It also enables your code editor to understand your feature flags, integrate the appropriate ConfigCat SDK into your project or even create new feature flags directly in your codebase.

## Features

- **Tools**: 
  - Complete set of tools for ConfigCat's public management API operations. You can Create, Read, Update and Delete any entities like Feature Flags, Configs, Environments or Products within ConfigCat.
  - Get comprehensive SDK documentation and code examples for seamless feature flag implementation in your project.

## Setup

You can use the following environment variables to configure the MCP server.

| Environment variable | Required | Default | Description |
| -------------------- | -------- | ------- | ----------- |
| CONFIGCAT_API_USER   | &#9745;  |         | [ConfigCat Management API basic authentication username](https://app.configcat.com/my-account/public-api-credentials). |
| CONFIGCAT_API_PASS   | &#9745;  |         | [ConfigCat Management API basic authentication password](https://app.configcat.com/my-account/public-api-credentials). |
| CONFIGCAT_BASE_URL   |          | https://api.configcat.com | ConfigCat Management API host. |


The instructions below shows how to connect a client to the MCP server. 

### Cursor

1. Open `Preferences` -> `Cursor Settings` -> `MCP & Integrations`
2. Click `Add Custom MCP`
3. Add the following server definition for the ConfigCat MCP server:

```json
{
  "mcpServers": {
    "ConfigCat": {
      "command": "npx",
      "args": ["-y", "@configcat/mcp-server"],
      "env": {
        "CONFIGCAT_API_USER": "YOUR_API_USER",
        "CONFIGCAT_API_PASS": "YOUR_API_PASSWORD"
      }
    }
  }
}
```

4. Save the settings.

### Visual Studio Code

1. Create a `.vscode/mcp.json` file in your project root with the following content:

```json
{
  "servers": {
    "ConfigCat": {
      "command": "npx",
      "args": ["-y", "@configcat/mcp-server"],
      "env": {
        "CONFIGCAT_API_USER": "YOUR_API_USER",
        "CONFIGCAT_API_PASS": "YOUR_API_PASSWORD"
      }
    }
  }
}
```

2. Save the settings file. The MCP server should now be available in VS Code.

### Claude Desktop

1. Open **Settings** &rarr; **Developer**
2. Click **Edit Config**
3. Open `claude_desktop_config.json`
4. Add the following server definition for the ConfigCat MCP server:

```json
{
  "mcpServers": {
    "ConfigCat": {
      "command": "npx",
      "args": ["-y", "@configcat/mcp-server"],
      "env": {
        "CONFIGCAT_API_USER": "YOUR_API_USER",
        "CONFIGCAT_API_PASS": "YOUR_API_PASSWORD"
      }
    }
  }
}
```

5. Save and restart Claude.

## Available Tools

### Membership Management

#### Organizations

- `list-organizations` - List all organizations

#### Members

- `list-organization-members` - List organization members
- `list-pending-invitations` - List pending invitations
- `list-pending-invitations-org` - List org pending invitations
- `list-product-members` - List product members
- `invite-member` - Invite a new member
- `update-member-permissions` - Update the permissions of a member
- `delete-organization-member` - Remove organization member
- `delete-product-member` - Remove product member
- `delete-invitation` - Cancel invitation

#### Permission Groups

- `list-permission-groups` - List permission groups
- `create-permission-group` - Create a new permission group
- `get-permission-group` - Get permission group details
- `update-permission-group` - Update permission group
- `delete-permission-group` - Delete permission group

### General

#### Products

- `list-products` - List all products
- `get-product` - Get specific product details
- `update-product` - Update existing product
- `delete-product` - Delete a product
- `get-product-preferences` - Get product preferences
- `update-product-preferences` - Update product preferences
- `create-product` - Create a new product

#### Configs

- `list-configs` - List configs for a product
- `create-config` - Create a new config
- `get-config` - Get specific config details
- `update-config` - Update existing config
- `delete-config` - Delete a config

#### Environments

- `list-environments` - List environments for a product
- `create-environment` - Create a new environment
- `get-environment` - Get specific environment details
- `update-environment` - Update existing environment
- `delete-environment` - Delete an environment

#### Segments

- `list-segments` - List user segments
- `create-segment` - Create a new segment
- `get-segment` - Get specific segment details
- `update-segment` - Update existing segment
- `delete-segment` - Delete a segment

#### SDK Keys

- `get-sdk-keys` - Get SDK keys for config/environment

#### Webhooks

- `list-webhooks` - List webhooks
- `get-webhook` - Get webhook details
- `replace-webhook` - Replace webhook configuration
- `update-webhook` - Update existing webhook
- `delete-webhook` - Delete a webhook
- `get-webhook-signing-keys` - List webhook signing keys
- `create-webhook` - Create a new webhook

#### Integrations

- `list-integrations` - List integrations
- `create-integration` - Create a new integration
- `get-integration` - Get integration details
- `update-integration` - Update existing integration
- `delete-integration` - Delete an integration

#### Code References

- `get-code-references` - Get code references

### Diagnostics

#### Audit logs

- `list-auditlogs` - Get product audit logs
- `list-organization-auditlogs` - Get organization audit logs

#### Zombie (stale) flags

- `list-staleflags` - Get stale feature flags report

### Feature Flag metadata

#### Feature Flags & Settings

- `list-settings` - List feature flags for a config
- `create-setting` - Create a new feature flag
- `get-setting` - Get specific feature flag details
- `replace-setting` - Replace feature flag configuration
- `update-setting` - Update existing feature flag
- `delete-setting` - Delete a feature flag

#### Tags

- `list-tags` - List tags for a product
- `create-tag` - Create a new tag
- `list-settings-by-tag` - Get feature flags by tag
- `get-tag` - Get specific tag details
- `update-tag` - Update existing tag
- `delete-tag` - Delete a tag

### Feature Flag & Setting Values (v1 & v2 APIs)

- `get-setting-value` - Get feature flag value
- `update-setting-value` - Update feature flag value
- `replace-setting-value` - Replace feature flag value
- `get-setting-values` - Get multiple setting values
- `post-setting-values` - Update multiple setting values
- V2 variants: `*-v2` versions of above tools for Config V2

### SDK documentation

- `update-sdk-documentation` - Get comprehensive SDK documentation and code examples for seamless feature flag implementation in your project.

## API Rate Limits

The ConfigCat public API has rate limits. The server will respect these limits and return appropriate error messages if limits are exceeded.

## Security Note

This server is designed for management operations only. Do not use it for evaluating feature flag values in production applications - use the [ConfigCat SDKs](https://configcat.com/docs/sdk-reference/overview/) or [ConfigCat Proxy](https://configcat.com/docs/advanced/proxy/proxy-overview/) instead.

## Need help?
https://configcat.com/support

## Contributing
Contributions are welcome. For more info please read the [Contribution Guideline](CONTRIBUTING.md).

## About ConfigCat
- [ConfigCat MCP server documentation](https://configcat.com/docs/advanced/mcp-server)
- [Documentation](https://configcat.com/docs)
- [Blog](https://configcat.com/blog)
