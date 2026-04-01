import { Buffer } from "node:buffer";

export class HttpClient {
  private readonly userAgent: string;
  private cachedUsername = "";
  private cachedPassword = "";
  private cachedAuthHeader = "";

  constructor(userAgent: string) {
    this.userAgent = userAgent;
  }

  private get baseUrl(): string {
    return (process.env.CONFIGCAT_BASE_URL ?? "https://api.configcat.com").replace(/\/$/, "");
  }

  private get authHeader(): string {
    const username = process.env.CONFIGCAT_API_USER ?? "";
    const password = process.env.CONFIGCAT_API_PASS ?? "";
    if (!username || !password) {
      throw new Error("Please set CONFIGCAT_API_USER and CONFIGCAT_API_PASS environment variables (Public API credentials). You can create your credentials on the Public API credentials management page: https://app.configcat.com/my-account/public-api-credentials.");
    }
    if (username !== this.cachedUsername || password !== this.cachedPassword) {
      this.cachedUsername = username;
      this.cachedPassword = password;
      const encoded = Buffer.from(`${username}:${password}`).toString("base64");
      this.cachedAuthHeader = `Basic ${encoded}`;
    }
    return this.cachedAuthHeader;
  }

  // HTTP request with Basic auth and JSON handling
  async request(path: string, init: RequestInit = {}): Promise<Response> {
    const url = path.startsWith("http") ? path : `${this.baseUrl}${path}`;
    const headers = new Headers();
    headers.set("Authorization", this.authHeader);
    headers.set("Accept", "application/json");
    headers.set("Content-Type", "application/json");
    headers.set("User-Agent", this.userAgent);

    // Add any additional headers from init
    if (init.headers) {
      const additionalHeaders = new Headers(init.headers);
      for (const [key, value] of additionalHeaders.entries()) {
        headers.set(key, value);
      }
    }

    const response = await fetch(url, {
      ...init,
      headers,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      const rate = {
        remaining: response.headers.get("X-Rate-Limit-Remaining"),
        reset: response.headers.get("X-Rate-Limit-Reset"),
      };
      throw new Error(`HTTP ${response.status} ${response.statusText} for ${url} - ${text} - rate: ${JSON.stringify(rate)}`);
    }

    return response;
  }

  // Simple fetch with User-Agent header
  async fetch(url: string): Promise<Response> {
    return await fetch(url, {
      redirect: "follow",
      headers: {
        "User-Agent": this.userAgent,
      },
    });
  }
}
