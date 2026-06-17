import { describe, expect, it, vi } from "vitest";
import { HttpClient } from "../../src/http.js";
import { registerConfigCatDocsTools } from "../../src/tools/configcat-docs.js";

type RegisterToolCallback = (args: { url: string }) => Promise<{
  content: { type: string; text: string }[];
  isError?: boolean;
}>;

describe("registerConfigCatDocsTools", () => {
  it("downloads llms.txt, finds the JavaScript SDK URL, and returns the docs content to the LLM", async () => {
    const http = new HttpClient("ConfigCat MCP Test");

    let callback: RegisterToolCallback | undefined;
    let toolDescription: string | undefined;

    const server = {
      registerTool: vi.fn((_name: string, config: { description: string }, cb: RegisterToolCallback) => {
        toolDescription = config.description;
        callback = cb;
      }),
    };

    // Fetches real llms.txt from configcat.com
    await registerConfigCatDocsTools(server as never, http);

    expect(server.registerTool).toHaveBeenCalledOnce();
    expect(callback).toBeDefined();
    expect(toolDescription).toBeDefined();

    // Find the JavaScript SDK URL from the embedded SDK Reference section in the tool description
    const linkMatches = [...toolDescription!.matchAll(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g)];
    const jsLink = linkMatches.find(m => m[1].toLowerCase().includes("javascript"));
    expect(jsLink, "JavaScript SDK link should be present in the SDK Reference section").toBeDefined();

    const jsDocsUrl = jsLink![2];

    // Call the registered tool callback with the discovered JS docs URL — fetches the real docs
    const result = await callback!({ url: jsDocsUrl });

    expect(result.isError).not.toBe(true);
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe("text");
    expect(result.content[0].text.length).toBeGreaterThan(100);
    // Validate the downloaded page is actually JavaScript SDK documentation
    expect(result.content[0].text.toLowerCase()).toContain("javascript");
  }, 30_000);
});
