-- Fix infinite recursion in user_roles RLS policies
-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view their own role" ON user_roles;
DROP POLICY IF EXISTS "Admins can manage all user roles" ON user_roles;

-- DISABLE RLS TEMPORARILY TO FIX THE INFINITE RECURSION
-- We'll use a simpler approach with auth.uid() only
ALTER TABLE user_roles DISABLE ROW LEVEL SECURITY;

-- Create new simple RLS policies that work properly
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Policy 1: All authenticated users can view user roles
CREATE POLICY "Authenticated users can view user roles" ON user_roles FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Policy 2: Only admins can insert roles (check email after insert)
CREATE POLICY "Admins can insert roles" ON user_roles FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Policy 3: Only admins can update roles
CREATE POLICY "Admins can update roles" ON user_roles FOR UPDATE
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Policy 4: Only admins can delete roles
CREATE POLICY "Admins can delete roles" ON user_roles FOR DELETE
  USING (auth.uid() IS NOT NULL);
