import { Buffer } from "node:buffer";

export type HttpOptions = {
  baseUrl: string;
  username: string;
  password: string;
  userAgent?: string;
};

export class HttpClient {
  private readonly baseUrl: string;
  private readonly authHeader: string;
  private readonly userAgent: string;

  constructor(opts: HttpOptions) {
    this.baseUrl = opts.baseUrl.replace(/\/$/, "");
    const encoded = Buffer.from(`${opts.username}:${opts.password}`).toString("base64");
    this.authHeader = `Basic ${encoded}`;
    this.userAgent = opts.userAgent ?? "";
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
