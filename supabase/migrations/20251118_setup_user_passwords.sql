-- Update profiles table with passwords for existing users
-- Run this after the migration: 20251118_add_password_column.sql

-- For account@jnknutrition.com (Nashid)
-- Password: 1710jnk3 (bcrypt hash would be needed in production)
UPDATE profiles 
SET password = '1710jnk3'  -- In production, use bcrypt hash
WHERE email = 'account@jnknutrition.com';

-- For admin@jnknutrition.com (Kamal)
-- Set a password as needed
UPDATE profiles 
SET password = 'admin_password_here'  -- Replace with actual password
WHERE email = 'admin@jnknutrition.com';

-- For kamal@jnknutrition.com (Mazhar Rony)
-- Set a password as needed
UPDATE profiles 
SET password = 'password_here'  -- Replace with actual password
WHERE email = 'kamal@jnknutrition.com';

-- Verify the updates
SELECT id, email, full_name, password FROM profiles WHERE password IS NOT NULL;
