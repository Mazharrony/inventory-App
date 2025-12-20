-- Simplified User Management Migration
-- Creates app_users table, RPC functions, and initial admin user

-- Drop existing table if it exists to ensure clean recreation
DROP TABLE IF EXISTS app_users CASCADE;

-- Create app_users table
CREATE TABLE app_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT CHECK (role IN ('admin', 'seller', 'accounts')) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Disable RLS for simplicity (custom authentication)
ALTER TABLE app_users DISABLE ROW LEVEL SECURITY;

-- Create RPC function to create a new user
CREATE OR REPLACE FUNCTION create_app_user(
  p_username TEXT,
  p_full_name TEXT,
  p_password TEXT,
  p_role TEXT
) RETURNS JSON AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Check if username already exists
  IF EXISTS (SELECT 1 FROM app_users WHERE username = LOWER(p_username)) THEN
    RAISE EXCEPTION 'Username already exists';
  END IF;

  -- Insert new user
  INSERT INTO app_users (username, full_name, password_hash, role)
  VALUES (LOWER(p_username), p_full_name, crypt(p_password, gen_salt('bf')), p_role)
  RETURNING id INTO v_user_id;

  RETURN json_build_object('id', v_user_id, 'message', 'User created successfully');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create RPC function to update a user
CREATE OR REPLACE FUNCTION update_app_user(
  p_user_id UUID,
  p_full_name TEXT,
  p_role TEXT,
  p_password TEXT DEFAULT NULL
) RETURNS JSON AS $$
BEGIN
  -- Update user details
  UPDATE app_users
  SET
    full_name = p_full_name,
    role = p_role,
    password_hash = CASE
      WHEN p_password IS NOT NULL AND p_password != '' THEN crypt(p_password, gen_salt('bf'))
      ELSE password_hash
    END
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  RETURN json_build_object('message', 'User updated successfully');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create RPC function to authenticate a user
CREATE OR REPLACE FUNCTION authenticate_user(
  p_username TEXT,
  p_password TEXT
) RETURNS JSON AS $$
DECLARE
  v_user app_users%ROWTYPE;
BEGIN
  -- Find active user by username
  SELECT * INTO v_user
  FROM app_users
  WHERE username = LOWER(p_username) AND is_active = true;

  IF v_user.id IS NULL THEN
    RETURN json_build_object('authenticated', false, 'message', 'Invalid username or password');
  END IF;

  -- Check password
  IF v_user.password_hash = crypt(p_password, v_user.password_hash) THEN
    RETURN json_build_object(
      'authenticated', true,
      'user', json_build_object(
        'id', v_user.id,
        'username', v_user.username,
        'full_name', v_user.full_name,
        'role', v_user.role,
        'is_active', v_user.is_active,
        'created_at', v_user.created_at
      )
    );
  ELSE
    RETURN json_build_object('authenticated', false, 'message', 'Invalid username or password');
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert initial admin user
INSERT INTO app_users (username, full_name, password_hash, role)
VALUES ('admin', 'Admin User', crypt('admin123', gen_salt('bf')), 'admin')
ON CONFLICT (username) DO NOTHING;
