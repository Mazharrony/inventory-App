-- Add is_active column to products table for soft deletion
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='products' AND column_name='is_active') THEN
        ALTER TABLE public.products ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
    END IF;
END $$;

-- Set all existing products to active
UPDATE public.products SET is_active = TRUE WHERE is_active IS NULL;

COMMENT ON COLUMN public.products.is_active IS 'Whether the product is active (true) or deactivated (false)';
