export type ModelSyncClientOptions = {
  baseUrl: string;
  apiKey: string;
  fetch?: typeof fetch;
};

export class ModelSyncClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: ModelSyncClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.apiKey = options.apiKey;
    this.fetchImpl = options.fetch ?? fetch;
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await this.fetchImpl(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        "content-type": "application/json",
        "x-api-key": this.apiKey,
        ...(init?.headers ?? {}),
      },
    });
    const data = (await res.json()) as { error?: string } & T;
    if (!res.ok) {
      throw new Error(typeof data?.error === "string" ? data.error : res.statusText);
    }
    return data as T;
  }

  listRuns() {
    return this.request<unknown[]>("/api/v1/runs");
  }

  createRun(body: { name: string; modelTag: string; notes?: string }) {
    return this.request("/api/v1/runs", {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  ingestMetrics(runId: string, body: { text?: string; json?: unknown }) {
    return this.request(`/api/v1/runs/${runId}/metrics`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  diagnose(runId: string) {
    return this.request(`/api/v1/runs/${runId}/diagnose`, { method: "POST" });
  }

  listConnectors() {
    return this.request("/api/v1/connectors");
  }
}

export function createClient(options: ModelSyncClientOptions): ModelSyncClient {
  return new ModelSyncClient(options);
}
