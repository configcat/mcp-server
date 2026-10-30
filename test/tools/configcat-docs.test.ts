import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HttpClient } from "../../src/http.js";

let registerConfigCatDocsTools: typeof import("../../src/tools/configcat-docs.js").registerConfigCatDocsTools;

beforeEach(async () => {
  // Each test supplies its own llms.txt content, so it needs a fresh module cache.
  vi.resetModules();
  ({ registerConfigCatDocsTools } = await import("../../src/tools/configcat-docs.js"));
});

afterEach(() => {
  vi.restoreAllMocks();
});

type RegisterToolCallback = (args: { url: string }) => Promise<{
  content: { type: string; text: string }[];
  isError?: boolean;
}>;

describe("registerConfigCatDocsTools", () => {
  it("caches llms.txt for one hour and fetches it again at expiry", async () => {
    const ttl = 60 * 60 * 1000;
    const now = vi.spyOn(Date, "now").mockReturnValue(0);
    const http = new HttpClient("ConfigCat MCP Test");
    const fetch = vi.spyOn(http, "fetch").mockImplementation(() => Promise.resolve(new Response(
      "## SDK Reference\n- [JavaScript SDK](https://configcat.com/docs/sdk-reference/js/overview.md)"
    )));
    const register = () => registerConfigCatDocsTools({ registerTool: vi.fn() } as never, http);

    await register();
    expect(fetch).toHaveBeenCalledOnce();

    now.mockReturnValue(ttl - 1);
    await register();
    expect(fetch).toHaveBeenCalledOnce();

    now.mockReturnValue(ttl);
    await register();
    expect(fetch).toHaveBeenCalledTimes(2);
  });

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

  it("accepts trusted SDK docs URL", async () => {
    const llmsText = `
# ConfigCat docs

## SDK Reference
- [JavaScript SDK](https://configcat.com/docs/sdk-reference/js/overview.md)
- [Node.js SDK](https://configcat.com/docs/sdk-reference/js/node.md)
`;

    const http = {
      fetch: vi.fn((url: string) => {
        if (url === "https://configcat.com/docs/llms.txt") {
          return Promise.resolve(new Response(llmsText, { status: 200 }));
        }

        return Promise.resolve(new Response("JavaScript SDK docs content", { status: 200 }));
      }),
    } as unknown as HttpClient;

    let callback: RegisterToolCallback | undefined;
    const server = {
      registerTool: vi.fn((_name: string, _config: { description: string }, cb: RegisterToolCallback) => {
        callback = cb;
      }),
    };

    await registerConfigCatDocsTools(server as never, http);

    const result = await callback!({
      url: "https://configcat.com/docs/sdk-reference/js/overview.md",
    });

    expect(result.isError).toBeUndefined();
    expect(result.content[0].type).toBe("text");
    expect(result.content[0].text).toContain("JavaScript SDK docs content");
  });

  it("rejects a URL whose path is allowed in llms.txt but whose host is different", async () => {
    const llmsText = `
# ConfigCat docs

## SDK Reference
- [JavaScript SDK](https://configcat.com/docs/sdk-reference/js/overview.md)
`;

    const http = {
      fetch: vi.fn((url: string) => {
        if (url === "https://configcat.com/docs/llms.txt") {
          return Promise.resolve(new Response(llmsText, { status: 200 }));
        }

        return Promise.resolve(new Response("should not be reached", { status: 200 }));
      }),
    } as unknown as HttpClient;

    let callback: RegisterToolCallback | undefined;
    const server = {
      registerTool: vi.fn((_name: string, _config: { description: string }, cb: RegisterToolCallback) => {
        callback = cb;
      }),
    };

    await registerConfigCatDocsTools(server as never, http);

    const result = await callback!({
      url: "https://evil.example/docs/sdk-reference/js/overview.md",
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Only configcat.com host is allowed");
  });

  it("rejects URLs on a trusted domain when the exact URL is missing from llms.txt", async () => {
    const llmsText = `
# ConfigCat docs

## SDK Reference
- [JavaScript SDK](https://configcat.com/docs/sdk-reference/js/overview.md)
`;

    const http = {
      fetch: vi.fn((url: string) => {
        if (url === "https://configcat.com/docs/llms.txt") {
          return Promise.resolve(new Response(llmsText, { status: 200 }));
        }

        return Promise.resolve(new Response("should not be reached", { status: 200 }));
      }),
    } as unknown as HttpClient;

    let callback: RegisterToolCallback | undefined;
    const server = {
      registerTool: vi.fn((_name: string, _config: { description: string }, cb: RegisterToolCallback) => {
        callback = cb;
      }),
    };

    await registerConfigCatDocsTools(server as never, http);

    const result = await callback!({
      url: "https://configcat.com/docs/sdk-reference/js/node.md",
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("URL is not in the trusted SDK documentation list");
  });

  it("rejects non-HTTPS SDK documentation URLs", async () => {
    const llmsText = `
# ConfigCat docs

## SDK Reference
- [JavaScript SDK](https://configcat.com/docs/sdk-reference/js/overview.md)
`;

    const http = {
      fetch: vi.fn((url: string) => {
        if (url === "https://configcat.com/docs/llms.txt") {
          return Promise.resolve(new Response(llmsText, { status: 200 }));
        }

        return Promise.resolve(new Response("should not be reached", { status: 200 }));
      }),
    } as unknown as HttpClient;

    let callback: RegisterToolCallback | undefined;
    const server = {
      registerTool: vi.fn((_name: string, _config: { description: string }, cb: RegisterToolCallback) => {
        callback = cb;
      }),
    };

    await registerConfigCatDocsTools(server as never, http);

    const result = await callback!({
      url: "http://configcat.com/docs/sdk-reference/js/overview.md",
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Only HTTPS URLs are allowed");
  });
});
