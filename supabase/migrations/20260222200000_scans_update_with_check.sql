-- Add WITH CHECK clause to scans UPDATE RLS policy (defense in depth)
-- Prevents a user from updating user_id on their own scan row
DROP POLICY IF EXISTS "Users can update their own scans" ON public.scans;
CREATE POLICY "Users can update their own scans"
  ON public.scans FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
