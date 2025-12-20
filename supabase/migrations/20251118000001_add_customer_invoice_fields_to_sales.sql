-- Add customer and invoice fields to sales table
ALTER TABLE sales 
ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS customer_mobile VARCHAR(20),
ADD COLUMN IF NOT EXISTS customer_address TEXT,
ADD COLUMN IF NOT EXISTS customer_trn VARCHAR(50),
ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS invoice_type VARCHAR(50) DEFAULT 'retail';

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_sales_customer_mobile ON sales(customer_mobile);
CREATE INDEX IF NOT EXISTS idx_sales_invoice_number ON sales(invoice_number);
CREATE INDEX IF NOT EXISTS idx_sales_customer_name ON sales(customer_name);

COMMENT ON COLUMN sales.customer_name IS 'Customer name for invoice';
COMMENT ON COLUMN sales.customer_mobile IS 'Customer mobile number';
COMMENT ON COLUMN sales.customer_address IS 'Customer address for invoice';
COMMENT ON COLUMN sales.customer_trn IS 'Customer TRN for corporate invoices';
COMMENT ON COLUMN sales.invoice_number IS 'Unique invoice number';
COMMENT ON COLUMN sales.invoice_type IS 'Invoice type: retail, wholesale, or corporate';
