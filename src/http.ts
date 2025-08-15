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
    this.userAgent = opts.userAgent ?? "configcat-mcp/0.1.0";
  }

  async request(path: string, init: RequestInit = {}) {
    const url = path.startsWith("http") ? path : `${this.baseUrl}${path}`;
    const res = await fetch(url, {
      ...init,
      headers: {
        "Authorization": this.authHeader,
        "Accept": "application/json",
        "Content-Type": "application/json",
        "User-Agent": this.userAgent,
        ...(init.headers || {}),
      },
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      const rate = {
        remaining: res.headers.get("X-Rate-Limit-Remaining"),
        reset: res.headers.get("X-Rate-Limit-Reset"),
      };
      throw new Error(`HTTP ${res.status} ${res.statusText} for ${url} - ${text} - rate: ${JSON.stringify(rate)}`);
    }

    const ct = res.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      return (await res.json());
    }
    return (await res.text());
  }
}
