-- Allow users to delete their own scans
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'scans' AND policyname = 'Users can delete their own scans'
  ) THEN
    CREATE POLICY "Users can delete their own scans"
      ON public.scans
      FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END;
$$;
