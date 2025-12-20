CREATE TABLE IF NOT EXISTS public.invoice_edit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number VARCHAR(100) NOT NULL,
  transaction_id VARCHAR(255) NOT NULL,
  edited_by VARCHAR(255) NOT NULL,
  edited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  changes_summary JSONB,
  previous_data JSONB,
  new_data JSONB,
  edit_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoice_edit_logs_invoice_number ON public.invoice_edit_logs(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoice_edit_logs_transaction_id ON public.invoice_edit_logs(transaction_id);
CREATE INDEX IF NOT EXISTS idx_invoice_edit_logs_edited_at ON public.invoice_edit_logs(edited_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoice_edit_logs_edited_by ON public.invoice_edit_logs(edited_by);

ALTER TABLE public.invoice_edit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view invoice edit logs" ON public.invoice_edit_logs;
DROP POLICY IF EXISTS "Authenticated users can insert invoice edit logs" ON public.invoice_edit_logs;

CREATE POLICY "Authenticated users can view invoice edit logs"
  ON public.invoice_edit_logs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert invoice edit logs"
  ON public.invoice_edit_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);


