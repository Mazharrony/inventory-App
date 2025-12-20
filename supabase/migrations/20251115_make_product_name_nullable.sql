-- Make product_name column nullable so product name can be optional
ALTER TABLE public.sales
  ALTER COLUMN product_name DROP NOT NULL;
