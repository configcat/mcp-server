import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type {
  CallToolResult,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import type { HttpClient } from "../http";

const LLMS_TXT_URL = "https://configcat.com/docs/llms.txt";
const TRUSTED_HOSTNAME = "configcat.com";
const TRUSTED_SDK_PATH_PREFIX = "/docs/sdk-reference";

function extractMarkdownSection(content: string, sectionHeader: string): string {
  const sectionIndex = content.indexOf(sectionHeader);
  if (sectionIndex !== -1) {
    const rest = content.substring(sectionIndex + sectionHeader.length);
    const nextHeadingIndex = rest.search(/\n##\s+/); // looks for "\n## ..."

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

function normalizeUrl(url: URL): string {
  const normalized = new URL(url.toString());
  normalized.hash = "";
  if ((normalized.protocol === "https:" && normalized.port === "443") || (normalized.protocol === "http:" && normalized.port === "80")) {
    normalized.port = "";
  }
  return normalized.toString();
}

function validateDestination(url: URL): void {
  if (url.protocol !== "https:") {
    throw new Error(`Only HTTPS URLs are allowed. Rejected: ${url.toString()}`);
  }

  if (url.username || url.password) {
    throw new Error(`Userinfo is not allowed in URLs. Rejected: ${url.toString()}`);
  }

  const hostname = url.hostname.toLowerCase();
  if (hostname !== TRUSTED_HOSTNAME) {
    throw new Error(`Only ${TRUSTED_HOSTNAME} host is allowed. Rejected: ${url.toString()}`);
  }

  if (url.port && url.port !== "443") {
    throw new Error(`Only default HTTPS port is allowed. Rejected: ${url.toString()}`);
  }

  const isValidPath = url.pathname === TRUSTED_SDK_PATH_PREFIX
    || url.pathname.startsWith(`${TRUSTED_SDK_PATH_PREFIX}/`);
  if (!isValidPath) {
    throw new Error(`Only ${TRUSTED_SDK_PATH_PREFIX} paths are allowed. Rejected: ${url.toString()}`);
  }
}

async function fetchSdkDocumentation(
  requestedUrl: string,
  http: HttpClient,
  allowedUrls: Set<string>
): Promise<Response> {
  const url = new URL(requestedUrl);
  validateDestination(url);

  const normalizedUrl = normalizeUrl(url);
  if (!allowedUrls.has(normalizedUrl)) {
    throw new Error(`URL is not in the trusted SDK documentation list from ${LLMS_TXT_URL}: ${requestedUrl}`);
  }

  return await http.fetch(url.toString());
}

export async function registerConfigCatDocsTools(server: McpServer, http: HttpClient): Promise<void> {
  const response = await http.fetch(LLMS_TXT_URL);
  if (!response.ok) {
    console.error(`Failed to fetch ${LLMS_TXT_URL} - HTTP ${response.status}: ${response.statusText}`);
    return;
  }

  const sdkDocs = extractMarkdownSection(await response.text(), "## SDK Reference");
  if (!sdkDocs) {
    console.error(`Failed to extract SDK Reference section from ${LLMS_TXT_URL}`);
    return;
  }

  const allowedUrls = new Set<string>();
  const sdkUrlRegex = /https:\/\/configcat\.com\/docs\/sdk-reference\/[^\s)]+/g;
  let match: RegExpExecArray | null;
  while ((match = sdkUrlRegex.exec(sdkDocs)) !== null) {
    try {
      const url = new URL(match[0]);
      const normalizedUrl = normalizeUrl(url);
      allowedUrls.add(normalizedUrl);
    } catch (error) {
      console.error(`Invalid URL found in SDK Reference section: ${match[0]} - ${error instanceof Error ? error.message : String(error)}`);
    }
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
        const response = await fetchSdkDocumentation(url, http, allowedUrls);

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
