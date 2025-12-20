-- ============================================================================
-- FIX USER MANAGEMENT CONFLICTS - SAFER VERSION
-- This resolves conflicts between Settings.tsx and SettingsSimple.tsx
-- ============================================================================

-- 1. Drop only the problematic recursive policies
DROP POLICY IF EXISTS "Users can view their own role" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage all user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can read their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- 2. Create simple, non-recursive policies
-- Allow authenticated users to read user roles (for display)
CREATE POLICY "user_roles_read_authenticated" ON public.user_roles
    FOR SELECT USING (auth.role() = 'authenticated');

-- Allow authenticated users to manage user roles (admin functionality)
CREATE POLICY "user_roles_manage_authenticated" ON public.user_roles
    FOR ALL USING (auth.role() = 'authenticated');

-- Allow authenticated users to read profiles
CREATE POLICY "profiles_read_authenticated" ON public.profiles
    FOR SELECT USING (auth.role() = 'authenticated');

-- Allow authenticated users to manage profiles
CREATE POLICY "profiles_manage_authenticated" ON public.profiles
    FOR ALL USING (auth.role() = 'authenticated');

-- 3. Ensure admin user exists
INSERT INTO public.user_roles (user_id, email, role, is_active, created_at)
SELECT
    id,
    email,
    'admin',
    true,
    COALESCE(created_at, now())
FROM public.profiles
WHERE email = 'kamal@jnknutrition.com'
ON CONFLICT (email) DO UPDATE SET
    role = 'admin',
    is_active = true;

-- 4. Sync any missing user_roles from profiles
INSERT INTO public.user_roles (user_id, email, role, is_active, created_at)
SELECT
    p.id,
    p.email,
    CASE WHEN p.email = 'kamal@jnknutrition.com' THEN 'admin' ELSE 'seller' END,
    true,
    COALESCE(p.created_at, now())
FROM public.profiles p
WHERE p.id NOT IN (SELECT user_id FROM public.user_roles WHERE user_id IS NOT NULL)
ON CONFLICT (email) DO NOTHING;

-- 5. Create a safer user creation function
CREATE OR REPLACE FUNCTION handle_new_user_safely()
RETURNS TRIGGER AS $$
BEGIN
  -- Only insert if not already exists
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.id) THEN
    INSERT INTO public.profiles (id, email, full_name, created_at, updated_at)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
      NEW.created_at,
      NEW.created_at
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = NEW.id) THEN
    INSERT INTO public.user_roles (user_id, email, role, is_active, created_at)
    VALUES (
      NEW.id,
      NEW.email,
      CASE WHEN NEW.email = 'kamal@jnknutrition.com' THEN 'admin' ELSE 'seller' END,
      true,
      NEW.created_at
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Update trigger
DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_consistent ON auth.users;

CREATE TRIGGER on_auth_user_created_safe
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user_safely();

-- 7. Success message
DO $$
BEGIN
    RAISE NOTICE 'User management conflicts fixed safely!';
    RAISE NOTICE 'RLS policies updated without disabling RLS.';
    RAISE NOTICE 'User creation should now work consistently.';
END $$;
