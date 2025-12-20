-- Add missing status columns to sales table for deactivation functionality
-- This migration adds the columns needed for sales undo functionality

-- Add status column with default 'active'
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='sales' AND column_name='status') THEN
        ALTER TABLE public.sales ADD COLUMN status TEXT DEFAULT 'active' CHECK (status IN ('active', 'deactivated'));
    END IF;
END $$;

-- Add deactivation_reason column
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='sales' AND column_name='deactivation_reason') THEN
        ALTER TABLE public.sales ADD COLUMN deactivation_reason TEXT;
    END IF;
END $$;

-- Add deactivated_at column
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='sales' AND column_name='deactivated_at') THEN
        ALTER TABLE public.sales ADD COLUMN deactivated_at TIMESTAMPTZ;
    END IF;
END $$;

-- Add product_id column for better inventory integration
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='sales' AND column_name='product_id') THEN
        ALTER TABLE public.sales ADD COLUMN product_id UUID REFERENCES public.products(id);
    END IF;
END $$;

-- Update existing sales to have 'active' status if NULL
UPDATE public.sales SET status = 'active' WHERE status IS NULL;

COMMENT ON COLUMN public.sales.status IS 'Status of the sale: active or deactivated';
COMMENT ON COLUMN public.sales.deactivation_reason IS 'Reason why the sale was deactivated/undone';
COMMENT ON COLUMN public.sales.deactivated_at IS 'Timestamp when the sale was deactivated';
COMMENT ON COLUMN public.sales.product_id IS 'Reference to products table for inventory management';