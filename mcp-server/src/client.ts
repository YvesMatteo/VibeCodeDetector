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
      throw new Error(body.error || `HTTP ${res.status}: ${res.statusText}`);
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

  async listScans(limit?: number, status?: string): Promise<ScanListResponse> {
    const params = new URLSearchParams();
    if (limit) params.set('limit', String(limit));
    if (status) params.set('status', status);
    const qs = params.toString();
    return this.request<ScanListResponse>(`/api/scan${qs ? `?${qs}` : ''}`);
  }
}
