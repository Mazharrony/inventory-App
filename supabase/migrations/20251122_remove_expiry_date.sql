-- Remove expiry_date column from products table
-- This migration removes the expiry_date functionality entirely from the system

-- Drop the expiry_date column from products table
ALTER TABLE public.products DROP COLUMN IF EXISTS expiry_date;

-- Update any views or functions that might reference expiry_date
-- (No specific views found that reference expiry_date)

-- The products table now only contains: id, name, upc, price, stock, created_at, updated_at