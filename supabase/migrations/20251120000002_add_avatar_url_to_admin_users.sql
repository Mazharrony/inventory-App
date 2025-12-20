-- Add avatar_url column to admin_users table for profile avatars
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Update any existing records to have a default avatar
UPDATE admin_users 
SET avatar_url = 'https://api.dicebear.com/7.x/avataaars/svg?seed=' || username || '&backgroundColor=bfdbfe'
WHERE avatar_url IS NULL;