export interface ScanSummary {
  id: string;
  url: string;
  status: string;
  overall_score: number | null;
  created_at: string;
  completed_at: string | null;
}

export interface ScanListResponse {
  scans: ScanSummary[];
  total: number;
  limit: number;
  offset: number;
}

export interface ScanDetail {
  id: string;
  url: string;
  status: string;
  overall_score: number | null;
  results: Record<string, ScannerResult> | null;
  created_at: string;
  completed_at: string | null;
}

export interface ScannerResult {
  score?: number;
  error?: string;
  findings?: Finding[];
  [key: string]: unknown;
}

export interface Finding {
  title: string;
  severity: string;
  description?: string;
  recommendation?: string;
  evidence?: string;
  value?: string;
  [key: string]: unknown;
}

export interface RunScanResponse {
  success: boolean;
  scanId: string | null;
  url: string;
  overallScore: number;
  results: Record<string, ScannerResult>;
  completedAt: string;
}
