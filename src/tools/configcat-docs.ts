import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type {
  CallToolResult,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import type { HttpClient } from "../http";

const LLMS_TXT_URL = "https://configcat.com/docs/llms.txt";

function removeMarkdownSection(content: string, sectionHeader: string): string {
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

    // Remove just that section
    return content.substring(0, sectionIndex) + content.substring(endIndex);
  }
  return content;
}

export function registerConfigCatDocsTools(server: McpServer, http: HttpClient): void {
  server.tool(
    "update_documentation",
    `If the user asks for coding related to a feature flag (such as integrating the ConfigCat SDK, adding a feature flag, or removing a feature flag)
    or the user asks for information about ConfigCat, 
    always call the tool "update_documentation" first to download the latest ConfigCat SDK documentation.

    1. First call this tool "update_documentation" without any parameters to get the llms.txt file that lists URLs to various documentation pages.
    2. Analyze the URLs listed in the llms.txt file.
    3. Then call the tool "update_documentation" with specific URL from the llms.txt file to fetch relevant documentation page.`,
    {
      url: z.string().url().describe("The URL to fetch documentation from.").optional(),
    },
    async ({ url }): Promise<CallToolResult> => {
      try {
        if (!url) {
          console.error("No URL provided to update_documentation tool.");
          const response = await http.fetch(LLMS_TXT_URL);

          if (!response.ok) {
            return {
              content: [{
                type: "text",
                text: `Error: Failed to fetch ${LLMS_TXT_URL} - HTTP ${response.status}: ${response.statusText}`,
              }],
              isError: true,
            };
          }

          let content = await response.text();

          // Public Management API is already documented in the configcat-api tools, so remove it from the llms.txt content
          content = removeMarkdownSection(content, "### Public Management API").trim();

          return {
            content: [{
              type: "text",
              text: content,
            }],
          };
        }

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
    }
  );
}
