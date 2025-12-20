-- Add optional comment field to sales table for order completion notes
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS order_comment TEXT;

COMMENT ON COLUMN public.sales.order_comment IS 'Optional comment or note entered at order completion.';
