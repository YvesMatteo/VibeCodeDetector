import type { ScanListResponse, ScanDetail, RunScanResponse } from './types.js';

const REQUEST_TIMEOUT_MS = 120_000; // 2 minutes (scans can take a while)

export class CheckVibeClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(apiKey: string, baseUrl?: string) {
    this.apiKey = apiKey;
    this.baseUrl = (baseUrl || 'https://checkvibe.dev').replace(/\/$/, '');
  }

  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const res = await fetch(url, {
      ...options,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const msg = body.error || `HTTP ${res.status}: ${res.statusText}`;
      throw new Error(this.enrichErrorMessage(res.status, msg));
    }

    return res.json() as Promise<T>;
  }

  async runScan(url: string, githubRepo?: string, supabaseUrl?: string): Promise<RunScanResponse> {
    const body: Record<string, string> = { url };
    if (githubRepo) body.githubRepo = githubRepo;
    if (supabaseUrl) body.supabaseUrl = supabaseUrl;

    return this.request<RunScanResponse>('/api/scan', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async getScan(scanId: string): Promise<ScanDetail> {
    return this.request<ScanDetail>(`/api/scan/${encodeURIComponent(scanId)}`);
  }

  private enrichErrorMessage(status: number, message: string): string {
    const lower = message.toLowerCase();

    if (status === 401) {
      return `Authentication failed. Your API key may be invalid or expired. Check at checkvibe.dev/dashboard/api-keys.`;
    }

    if (status === 403 && lower.includes('domain')) {
      return `Access denied: API key is restricted to specific domains. Update allowed_domains or create a new key.`;
    }

    if (status === 403 && lower.includes('scope')) {
      return `Access denied: API key lacks the required scope. Create a new key with scan:read and scan:write.`;
    }

    if (status === 403) {
      return `Access denied. Check that your API key has the necessary permissions and has not been revoked.`;
    }

    if (status === 429) {
      return `Rate limit exceeded. Wait a moment before retrying, or upgrade your plan for higher limits.`;
    }

    // Don't forward raw server error messages — return generic message for 5xx
    if (status >= 500) {
      return `Server error (${status}). Please try again later.`;
    }

    return `Request failed (${status}). Please check your input and try again.`;
  }

  async listScans(limit?: number, status?: string): Promise<ScanListResponse> {
    const params = new URLSearchParams();
    if (limit) params.set('limit', String(limit));
    if (status) params.set('status', status);
    const qs = params.toString();
    return this.request<ScanListResponse>(`/api/scan${qs ? `?${qs}` : ''}`);
  }
}
