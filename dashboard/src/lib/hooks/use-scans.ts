import useSWR from 'swr';

export interface Scan {
  id: string;
  url: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  overall_score: number | null;
  created_at: string;
  completed_at: string | null;
  results: Record<string, unknown> | null;
  project_id: string | null;
}

interface ScansResponse {
  scans: Scan[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * Fetch scans for the authenticated user, optionally filtered by project.
 * Pass a `projectId` to scope results to a single project.
 */
export function useScans(projectId?: string | null) {
  const params = new URLSearchParams();
  if (projectId) {
    params.set('projectId', projectId);
  }
  const query = params.toString();
  const key = `/api/scan${query ? `?${query}` : ''}`;

  const { data, error, isLoading, mutate } = useSWR<ScansResponse>(key);

  return {
    scans: data?.scans ?? [],
    total: data?.total ?? 0,
    error,
    isLoading,
    mutate,
  };
}
