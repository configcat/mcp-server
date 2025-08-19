/* Minimal HTTP helper with Basic auth and JSON handling */
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

    const res = await fetch(url, {
      ...init,
      headers,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      const rate = {
        remaining: res.headers.get("X-Rate-Limit-Remaining"),
        reset: res.headers.get("X-Rate-Limit-Reset"),
      };
      throw new Error(`HTTP ${res.status} ${res.statusText} for ${url} - ${text} - rate: ${JSON.stringify(rate)}`);
    }

    return res;
  }
}
