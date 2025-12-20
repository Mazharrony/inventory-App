-- Create sales_undo_log table with proper structure
CREATE TABLE IF NOT EXISTS public.sales_undo_log (
  id SERIAL NOT NULL,
  sale_id INTEGER NULL,
  sale_data JSONB NULL,
  undone_by TEXT NULL,
  undone_at TIMESTAMP WITH TIME ZONE NULL DEFAULT NOW(),
  reason TEXT NULL,
  CONSTRAINT sales_undo_log_pkey PRIMARY KEY (id)
) TABLESPACE pg_default;

-- Add RLS (Row Level Security) policies
ALTER TABLE public.sales_undo_log ENABLE ROW LEVEL SECURITY;

-- Policy to allow all authenticated users to read undo logs
CREATE POLICY "Allow authenticated users to read undo logs"
ON public.sales_undo_log
FOR SELECT
TO authenticated
USING (true);

-- Policy to allow all authenticated users to insert undo logs
CREATE POLICY "Allow authenticated users to insert undo logs"
ON public.sales_undo_log
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sales_undo_log_undone_at ON public.sales_undo_log(undone_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_undo_log_sale_id ON public.sales_undo_log(sale_id);
CREATE INDEX IF NOT EXISTS idx_sales_undo_log_undone_by ON public.sales_undo_log(undone_by);

-- Grant necessary permissions
GRANT ALL ON public.sales_undo_log TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.sales_undo_log_id_seq TO authenticated;

COMMENT ON TABLE public.sales_undo_log IS 'Stores audit trail of undone sales transactions';
COMMENT ON COLUMN public.sales_undo_log.id IS 'Primary key for the undo log entry';
COMMENT ON COLUMN public.sales_undo_log.sale_id IS 'ID of the original sale that was undone';
COMMENT ON COLUMN public.sales_undo_log.sale_data IS 'Complete original sale data stored as JSON';
COMMENT ON COLUMN public.sales_undo_log.undone_by IS 'Username/email of the person who undid the sale';
COMMENT ON COLUMN public.sales_undo_log.undone_at IS 'Timestamp when the sale was undone';
COMMENT ON COLUMN public.sales_undo_log.reason IS 'Reason provided for undoing the sale';