-- Add unique constraint on mobile column in customers table
-- This is required for the upsert operation in the InvoiceModal component

ALTER TABLE public.customers ADD CONSTRAINT customers_mobile_unique UNIQUE (mobile);
