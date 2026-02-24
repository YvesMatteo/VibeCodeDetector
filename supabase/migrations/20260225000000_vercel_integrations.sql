-- Vercel Deploy Hook Integration tables
-- Allows automatic scans on Vercel deployments

-- vercel_integrations: one per project
CREATE TABLE IF NOT EXISTS vercel_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL UNIQUE REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    webhook_secret TEXT NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT true,
    last_deployment_at TIMESTAMPTZ,
    last_scan_id UUID,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- vercel_deployments: audit trail of deployment-triggered scans
CREATE TABLE IF NOT EXISTS vercel_deployments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    integration_id UUID NOT NULL REFERENCES vercel_integrations(id) ON DELETE CASCADE,
    vercel_deployment_id TEXT NOT NULL UNIQUE,
    deployment_url TEXT,
    git_branch TEXT,
    git_commit_sha TEXT,
    scan_id UUID REFERENCES scans(id) ON DELETE SET NULL,
    result_score INT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_vercel_integrations_user ON vercel_integrations(user_id);
CREATE INDEX IF NOT EXISTS idx_vercel_integrations_project ON vercel_integrations(project_id);
CREATE INDEX IF NOT EXISTS idx_vercel_deployments_integration ON vercel_deployments(integration_id);
CREATE INDEX IF NOT EXISTS idx_vercel_deployments_scan ON vercel_deployments(scan_id);
CREATE INDEX IF NOT EXISTS idx_vercel_deployments_created ON vercel_deployments(created_at DESC);

-- RLS policies
ALTER TABLE vercel_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE vercel_deployments ENABLE ROW LEVEL SECURITY;

-- vercel_integrations: users can only see/manage their own
CREATE POLICY "Users can view own vercel integrations"
    ON vercel_integrations FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own vercel integrations"
    ON vercel_integrations FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own vercel integrations"
    ON vercel_integrations FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own vercel integrations"
    ON vercel_integrations FOR DELETE
    USING (auth.uid() = user_id);

-- vercel_deployments: users can view deployments for their integrations
CREATE POLICY "Users can view own vercel deployments"
    ON vercel_deployments FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM vercel_integrations vi
            WHERE vi.id = vercel_deployments.integration_id
            AND vi.user_id = auth.uid()
        )
    );

-- Service role can insert/update deployments (webhook handler uses service role)
CREATE POLICY "Service role can manage vercel deployments"
    ON vercel_deployments FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
