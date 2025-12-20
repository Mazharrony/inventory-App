-- DISABLE EMAIL VERIFICATION FOR SELLER ACCOUNTS
-- This migration disables email verification requirements for all seller accounts
-- Email and password become permanent credentials

-- 1. Update auth settings to disable email confirmation
-- Note: This needs to be executed in Supabase dashboard or via API
-- Go to: Authentication > Settings > Email confirmation
-- Set "Enable email confirmations" to OFF

-- 2. Auto-confirm existing unconfirmed users (if any)
UPDATE auth.users
SET email_confirmed_at = NOW(),
    confirmed_at = NOW()
WHERE email_confirmed_at IS NULL;

-- 3. Create profiles for any confirmed users who don't have profiles yet
INSERT INTO public.profiles (id, full_name, updated_at)
SELECT
  u.id,
  COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)) as full_name,
  NOW() as updated_at
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE p.id IS NULL
  AND u.email_confirmed_at IS NOT NULL
ON CONFLICT (id) DO NOTHING;

-- 4. Optional: Add user_roles entries for users without roles
INSERT INTO public.user_roles (user_id, email, role, is_active)
SELECT
    u.id,
    u.email,
    COALESCE(u.raw_user_meta_data->>'role', 'seller') as role,
    true as is_active
FROM auth.users u
LEFT JOIN public.user_roles ur ON u.id = ur.user_id
WHERE ur.user_id IS NULL
  AND u.email_confirmed_at IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;

-- 5. Print confirmation
DO $$
BEGIN
    RAISE NOTICE 'Email verification disabled successfully!';
    RAISE NOTICE 'Users can now sign up and log in immediately without email confirmation.';
    RAISE NOTICE 'Email and password are now permanent credentials.';
END $$;
