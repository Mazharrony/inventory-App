-- Add transaction_id field to sales table for grouping multiple items in one invoice
-- This allows us to track which sales belong to the same transaction/invoice

DO $$
BEGIN
    -- Add transaction_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sales' 
        AND table_schema = 'public' 
        AND column_name = 'transaction_id'
    ) THEN
        ALTER TABLE public.sales ADD COLUMN transaction_id UUID DEFAULT gen_random_uuid();
        
        -- Create index for faster queries
        CREATE INDEX idx_sales_transaction_id ON public.sales(transaction_id);
        
        RAISE NOTICE 'Added transaction_id column to sales table';
    ELSE
        RAISE NOTICE 'transaction_id column already exists in sales table';
    END IF;
END $$;