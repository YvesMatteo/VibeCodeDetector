import type { ScanListResponse, ScanDetail, RunScanResponse } from './types.js';

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
      return `${message}\n→ Your API key may be invalid or expired. Check the key value and its expiry date at checkvibe.dev/dashboard/api-keys.`;
    }

    if (status === 403 && lower.includes('domain')) {
      return `${message}\n→ This API key is restricted to specific domains. Update the key's allowed_domains list or create a new key that permits this domain.`;
    }

    if (status === 403 && lower.includes('scope')) {
      return `${message}\n→ This API key lacks the required scope. Create a new key with the needed scopes (e.g., scan:read, scan:write).`;
    }

    if (status === 403) {
      return `${message}\n→ Access denied. Check that your API key has the necessary permissions and has not been revoked.`;
    }

    if (status === 429) {
      return `${message}\n→ Rate limit exceeded. Wait a moment before retrying, or upgrade your plan for higher rate limits (Starter: 10/min, Pro: 30/min, Enterprise: 100/min).`;
    }

    return message;
  }

  async listScans(limit?: number, status?: string): Promise<ScanListResponse> {
    const params = new URLSearchParams();
    if (limit) params.set('limit', String(limit));
    if (status) params.set('status', status);
    const qs = params.toString();
    return this.request<ScanListResponse>(`/api/scan${qs ? `?${qs}` : ''}`);
  }
}
