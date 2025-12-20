-- Add recorded_at column to track actual entry time (separate from created_at for backdated entries)
ALTER TABLE sales
ADD COLUMN recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add comment to explain the difference
COMMENT ON COLUMN sales.created_at IS 'Transaction date (may be manual entry from last 7 days)';
COMMENT ON COLUMN sales.recorded_at IS 'Actual time when entry was recorded in system';
