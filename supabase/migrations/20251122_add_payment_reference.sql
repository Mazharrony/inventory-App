-- Add payment_reference column to sales table for card/bank transfer reference numbers
ALTER TABLE sales ADD COLUMN IF NOT EXISTS payment_reference VARCHAR(255);

-- Add comment for documentation
COMMENT ON COLUMN sales.payment_reference IS 'Transaction reference number for card or bank transfer payments';
