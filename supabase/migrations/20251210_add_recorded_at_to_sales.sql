-- Migration to add recorded_at column to sales table
ALTER TABLE sales ADD COLUMN IF NOT EXISTS recorded_at timestamptz DEFAULT now();
