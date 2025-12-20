-- Fix RLS Policy for invoice_edit_logs
-- This allows inserts from the application (using anon key)

-- Drop existing policies
DROP POLICY IF EXISTS "Authenticated users can view invoice edit logs" ON public.invoice_edit_logs;
DROP POLICY IF EXISTS "Authenticated users can insert invoice edit logs" ON public.invoice_edit_logs;

-- Allow all users (including anon) to view invoice edit logs
CREATE POLICY "Allow all users to view invoice edit logs"
  ON public.invoice_edit_logs FOR SELECT
  TO public
  USING (true);

-- Allow all users (including anon) to insert invoice edit logs
CREATE POLICY "Allow all users to insert invoice edit logs"
  ON public.invoice_edit_logs FOR INSERT
  TO public
  WITH CHECK (true);


