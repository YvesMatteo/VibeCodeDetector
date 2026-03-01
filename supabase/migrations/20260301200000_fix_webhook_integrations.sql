-- Fix: Netlify deployments missing service_role write policy
-- The webhook handler uses service_role client to insert/update deployments,
-- but unlike vercel_deployments, netlify_deployments had no service_role policy.
CREATE POLICY "Service role can manage netlify deployments"
    ON netlify_deployments FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- Also add service_role policies for the integration tables themselves,
-- since webhook handlers need to read/update them via service_role client.
CREATE POLICY "Service role can manage vercel integrations"
    ON vercel_integrations FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can manage netlify integrations"
    ON netlify_integrations FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
