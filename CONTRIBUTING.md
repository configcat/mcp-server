# Contributing to the ConfigCat MCP Server

ConfigCat MCP Server is an open source project. Feedback and contribution are welcome. Contributions are made to this repo via Issues and Pull Requests.

## Submitting bug reports and feature requests

The ConfigCat team monitors the [issue tracker](https://github.com/configcat/mcp-server/issues) in the ConfigCat MCP Server repository. Bug reports and feature requests specific to this MCP Server should be filed in this issue tracker. The team will respond to all newly filed issues.

## Submitting pull requests

We encourage pull requests and other contributions from the community. 
- Before submitting pull requests, ensure that all temporary or unintended code is removed.
- Be accompanied by a complete Pull Request template (loaded automatically when a PR is created).
- Add unit or integration tests for fixed or changed functionality.

When you submit a pull request or otherwise seek to include your change in the repository, you waive all your intellectual property rights, including your copyright and patent claims for the submission. For more details please read the [contribution agreement](https://github.com/configcat/legal/blob/main/contribution-agreement.md).

In general, we follow the ["fork-and-pull" Git workflow](https://github.com/susam/gitpr)

1. Fork the repository to your own Github account
2. Clone the project to your machine
3. Create a branch locally with a succinct but descriptive name
4. Commit changes to the branch
5. Following any formatting and testing guidelines specific to this repo
6. Push changes to your fork
7. Open a PR in our repository and follow the PR template so that we can efficiently review the changes.

## Build instructions

The project uses [npm](https://www.npmjs.com) for dependency management.

### Install dependencies:

```bash
npm install
```

### Build the MCP server

```bash
npm run build
```

This will output the compiled JavaScript files to the `build/` directory (or as configured in `tsconfig.json`).

### Add the MCP server to your AI tool

When configuring your MCP client (e.g., Cursor, VS Code, Claude Desktop), use the absolute path to your local build. Example JSON config:

```json
{
  "mcpServers": {
    "configcat": {
      "command": "node",
      "args": ["/absolute/path/to/configcat-mcp-server/build/index.js"],
      "env": {
        "CONFIGCAT_API_USER": "YOUR_API_USER",
        "CONFIGCAT_API_PASS": "YOUR_API_PASSWORD",
        "CONFIGCAT_BASE_URL": "YOUR_BASE_URL"
      }
    }
  }
}
```

Replace `/absolute/path/to/configcat-mcp-server/build/index.js` with the actual path on your machine.


## MCP Inspector

For a better development and debugging experience, try the [MCP Inspector](https://github.com/modelcontextprotocol/inspector) to test tools and more.

```bash
npx @modelcontextprotocol/inspector -e CONFIGCAT_API_USER=<user> -e CONFIGCAT_API_PASS=<password> -e CONFIGCAT_BASE_URL=https://api.configcat.com node build/index.js
```