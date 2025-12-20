-- Create undo log table to track sales that have been undone
CREATE TABLE IF NOT EXISTS sales_undo_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_sale_id UUID NOT NULL,
  sale_upc VARCHAR(255) NOT NULL,
  sale_product_name TEXT,
  sale_quantity INTEGER NOT NULL,
  sale_price DECIMAL(10,2) NOT NULL,
  sale_total DECIMAL(10,2) NOT NULL,
  seller_name VARCHAR(255) NOT NULL,
  original_sale_date TIMESTAMPTZ NOT NULL,
  undo_reason TEXT NOT NULL,
  undone_by VARCHAR(255) NOT NULL,
  undone_at TIMESTAMPTZ DEFAULT NOW(),
  inventory_restored BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policy for the undo log table
ALTER TABLE sales_undo_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to view undo logs" ON sales_undo_log
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to insert undo logs" ON sales_undo_log
  FOR INSERT TO authenticated WITH CHECK (true);