-- Netlify deploy hook integration tables

CREATE TABLE IF NOT EXISTS netlify_integrations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    webhook_secret TEXT NOT NULL,
    enabled BOOLEAN DEFAULT true,
    last_deployment_at TIMESTAMPTZ,
    last_scan_id UUID,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(project_id, user_id)
);

CREATE TABLE IF NOT EXISTS netlify_deployments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    integration_id UUID NOT NULL REFERENCES netlify_integrations(id) ON DELETE CASCADE,
    netlify_deployment_id TEXT NOT NULL,
    deployment_url TEXT,
    scan_id UUID,
    result_score NUMERIC,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(netlify_deployment_id)
);

-- RLS policies
ALTER TABLE netlify_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE netlify_deployments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own netlify integrations"
    ON netlify_integrations FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own netlify integrations"
    ON netlify_integrations FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own netlify integrations"
    ON netlify_integrations FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own netlify integrations"
    ON netlify_integrations FOR DELETE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can view own netlify deployments"
    ON netlify_deployments FOR SELECT
    USING (
        integration_id IN (
            SELECT id FROM netlify_integrations WHERE user_id = auth.uid()
        )
    );
