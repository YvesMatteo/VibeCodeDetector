import useSWR from 'swr';

export interface Project {
  id: string;
  user_id: string;
  name: string;
  url: string;
  github_repo: string | null;
  backend_type: 'supabase' | 'firebase' | 'convex' | 'none';
  backend_url: string | null;
  supabase_pat: string | null;
  created_at: string;
  updated_at: string;
  /** Aggregated from latest completed scan */
  latestScore: number | null;
  /** ISO timestamp of most recent completed scan */
  lastAuditDate: string | null;
  /** Count of non-info findings in latest scan */
  issueCount: number;
}

interface ProjectsResponse {
  projects: Project[];
}

interface SingleProjectResponse {
  project: Project;
}

/**
 * Fetch all projects for the authenticated user.
 * Data is cached and deduplicated by SWR.
 */
export function useProjects() {
  const { data, error, isLoading, mutate } = useSWR<ProjectsResponse>('/api/projects');

  return {
    projects: data?.projects ?? [],
    error,
    isLoading,
    mutate,
  };
}

/**
 * Fetch a single project by ID.
 * Pass `null` or `undefined` to skip the request (conditional fetching).
 */
export function useProject(id: string | null | undefined) {
  const { data, error, isLoading, mutate } = useSWR<SingleProjectResponse>(
    id ? `/api/projects/${id}` : null,
  );

  return {
    project: data?.project ?? null,
    error,
    isLoading,
    mutate,
  };
}
