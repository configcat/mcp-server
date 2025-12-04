import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type {
  CallToolResult,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import type { HttpClient } from "../http";

const LLMS_TXT_URL = "https://configcat.com/docs/llms.txt";

function extractMarkdownSection(content: string, sectionHeader: string): string {
  const sectionIndex = content.indexOf(sectionHeader);
  if (sectionIndex !== -1) {
    const rest = content.substring(sectionIndex + sectionHeader.length);
    const nextHeadingIndex = rest.search(/\n###\s+/); // looks for "\n### ..."

    let endIndex;
    if (nextHeadingIndex !== -1) {
      endIndex = sectionIndex + sectionHeader.length + nextHeadingIndex;
    } else {
      endIndex = content.length;
    }

    // Extract just that section
    return content.substring(sectionIndex, endIndex).trim();
  }
  return "";
}

export async function registerConfigCatDocsTools(server: McpServer, http: HttpClient): Promise<void> {
  const response = await http.fetch(LLMS_TXT_URL);
  if (!response.ok) {
    console.error(`Failed to fetch ${LLMS_TXT_URL} - HTTP ${response.status}: ${response.statusText}`);
    return;
  }

  const sdkDocs = extractMarkdownSection(await response.text(), "### SDK Reference");
  if (!sdkDocs) {
    console.error(`Failed to extract SDK Reference section from ${LLMS_TXT_URL}`);
    return;
  }

  type RegisterToolConfig = Parameters<McpServer["registerTool"]>[1];
  type RegisterToolCallback = Parameters<McpServer["registerTool"]>[2];
  server.registerTool(
    "update-sdk-documentation",
    {
      description:
    `If the user asks for coding related to a feature flag (such as integrating the ConfigCat SDK, adding a feature flag, or removing a feature flag), 
    always call the tool "update-sdk-documentation" first to download the latest ConfigCat SDK documentation.

    1. Analyze the SDK URLs listed in the following SDK Reference list.
    2. Then call the tool "update-sdk-documentation" with specific URL from the SDK Reference list to fetch relevant documentation page.
    
    ${sdkDocs}`,
      inputSchema: {
        url: z.string().url().describe("The URL to fetch SDK documentation from."),
      },
    } as RegisterToolConfig,
    (async ({ url }: { url: string }): Promise<CallToolResult> => {
      try {
        console.error(`Fetching documentation from: ${url}`);
        const response = await http.fetch(url);

        if (!response.ok) {
          return {
            content: [{
              type: "text",
              text: `Error: Failed to fetch ${url} - HTTP ${response.status}: ${response.statusText}`,
            }],
            isError: true,
          };
        }

        const content = await response.text();
        console.error(`Successfully fetched ${content.length} characters from ${url}`);

        return {
          content: [{
            type: "text",
            text: content,
          }],
        };
      } catch (error) {
        console.error("Error fetching documentation:", error);

        return {
          content: [{
            type: "text",
            text: `Error: ${error instanceof Error ? error.message : String(error)}`,
          }],
          isError: true,
        };
      }
    }) as RegisterToolCallback
  );
}
