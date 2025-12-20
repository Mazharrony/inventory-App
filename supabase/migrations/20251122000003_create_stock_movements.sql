-- =====================================================
-- Stock Movements History Table
-- Purpose: Track all stock increases for inventory auditing
-- Created: 2025-11-22
-- =====================================================

-- First, check if stock_movements table already exists and drop it if needed
DROP TABLE IF EXISTS public.stock_movements CASCADE;

-- Create stock_movements table with product_id matching products.id type
-- Using TEXT for product_id to be compatible with any type (INTEGER, UUID, etc.)
CREATE TABLE public.stock_movements (
  id SERIAL PRIMARY KEY,
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  previous_stock INTEGER NOT NULL,
  new_stock INTEGER NOT NULL,
  quantity_added INTEGER NOT NULL,
  movement_type TEXT NOT NULL DEFAULT 'import', -- 'import', 'manual_add', 'edit', 'csv_import'
  created_by TEXT NOT NULL, -- Username or user ID who performed the action
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT -- Optional notes about the import
);

-- Note: We're using TEXT for product_id to avoid foreign key type conflicts
-- The application code will maintain referential integrity

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_stock_movements_product_id ON public.stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at ON public.stock_movements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created_by ON public.stock_movements(created_by);
CREATE INDEX IF NOT EXISTS idx_stock_movements_movement_type ON public.stock_movements(movement_type);

-- Add RLS policies (allow authenticated users to insert and read)
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all users to view stock movements
CREATE POLICY "Allow all users to view stock movements"
  ON public.stock_movements
  FOR SELECT
  USING (true);

-- Policy: Allow all users to insert stock movements
CREATE POLICY "Allow all users to insert stock movements"
  ON public.stock_movements
  FOR INSERT
  WITH CHECK (true);

-- Add comments for documentation
COMMENT ON TABLE public.stock_movements IS 'Tracks all stock increase history for inventory auditing and analytics';
COMMENT ON COLUMN public.stock_movements.product_id IS 'Foreign key reference to the product';
COMMENT ON COLUMN public.stock_movements.product_name IS 'Snapshot of product name at time of movement';
COMMENT ON COLUMN public.stock_movements.previous_stock IS 'Stock quantity before the increase';
COMMENT ON COLUMN public.stock_movements.new_stock IS 'Stock quantity after the increase';
COMMENT ON COLUMN public.stock_movements.quantity_added IS 'Number of units added (new_stock - previous_stock)';
COMMENT ON COLUMN public.stock_movements.movement_type IS 'Type of operation: import, manual_add, edit, csv_import';
COMMENT ON COLUMN public.stock_movements.created_by IS 'Username or ID of user who performed the stock increase';
COMMENT ON COLUMN public.stock_movements.created_at IS 'Timestamp when the stock increase occurred';
COMMENT ON COLUMN public.stock_movements.notes IS 'Optional notes or context about the import';
