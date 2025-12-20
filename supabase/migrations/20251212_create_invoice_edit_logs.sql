-- Create invoice edit logs table for audit trail
CREATE TABLE IF NOT EXISTS public.invoice_edit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number VARCHAR(100) NOT NULL,
  transaction_id VARCHAR(255) NOT NULL,
  edited_by VARCHAR(255) NOT NULL,
  edited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  changes_summary JSONB, -- Stores summary of what was changed
  previous_data JSONB, -- Stores previous invoice data
  new_data JSONB, -- Stores new invoice data after edit
  edit_reason TEXT, -- Optional reason for the edit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_invoice_edit_logs_invoice_number ON public.invoice_edit_logs(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoice_edit_logs_transaction_id ON public.invoice_edit_logs(transaction_id);
CREATE INDEX IF NOT EXISTS idx_invoice_edit_logs_edited_at ON public.invoice_edit_logs(edited_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoice_edit_logs_edited_by ON public.invoice_edit_logs(edited_by);

-- Enable RLS
ALTER TABLE public.invoice_edit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Allow authenticated users to view all edit logs
CREATE POLICY "Authenticated users can view invoice edit logs"
  ON public.invoice_edit_logs FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies - Allow authenticated users to insert edit logs
CREATE POLICY "Authenticated users can insert invoice edit logs"
  ON public.invoice_edit_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Add comments
COMMENT ON TABLE public.invoice_edit_logs IS 'Audit trail of all invoice edits for compliance and tracking';
COMMENT ON COLUMN public.invoice_edit_logs.invoice_number IS 'Invoice number that was edited';
COMMENT ON COLUMN public.invoice_edit_logs.transaction_id IS 'Transaction ID of the invoice';
COMMENT ON COLUMN public.invoice_edit_logs.edited_by IS 'Username/ID of the user who made the edit';
COMMENT ON COLUMN public.invoice_edit_logs.changes_summary IS 'Summary of changes made (items added/removed/modified, customer info changed, etc.)';
COMMENT ON COLUMN public.invoice_edit_logs.previous_data IS 'Complete invoice data before edit';
COMMENT ON COLUMN public.invoice_edit_logs.new_data IS 'Complete invoice data after edit';
COMMENT ON COLUMN public.invoice_edit_logs.edit_reason IS 'Optional reason provided for the edit';


