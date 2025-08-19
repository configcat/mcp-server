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

## Available Resources

- `configcat://products/{productId}` - ConfigCat product information
- `configcat://configs/{configId}` - Configuration details with feature flags

## Available Tools

- `list_products` - List all ConfigCat products
- `list_configs` - List configs for a product
- `get_config` - Get specific config details
- `list_environments` - List environments for a product
- `list_feature_flags` - List feature flags for a config
- `get_feature_flag` - Get specific feature flag details
- `create_feature_flag` - Create a new feature flag
- `update_feature_flag` - Update existing feature flag
- `delete_feature_flag` - Delete a feature flag

## Available Prompts

- `create_feature_flag_wizard` - Interactive feature flag creation
- `feature_flag_best_practices` - Best practices guidance
- `troubleshoot_feature_flag` - Troubleshooting assistance

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