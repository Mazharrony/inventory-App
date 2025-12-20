-- Add password column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS password TEXT;

-- Add comment explaining this is for reference only
COMMENT ON COLUMN profiles.password IS 'Password reference (hashed). Primary password management should be through auth.users';

-- Create index for faster lookups if needed
CREATE INDEX IF NOT EXISTS idx_profiles_email_password ON profiles(email) WHERE password IS NOT NULL;
