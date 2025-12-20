-- Create a secure RPC function to create users with proper password hashing
CREATE OR REPLACE FUNCTION create_user_with_password(
  p_email TEXT,
  p_password TEXT,
  p_full_name TEXT,
  p_role TEXT DEFAULT 'seller'
)
RETURNS JSON AS $$
DECLARE
  v_user_id UUID;
  v_encrypted_password TEXT;
BEGIN
  -- Generate encrypted password using bcrypt
  v_encrypted_password := crypt(p_password, gen_salt('bf'));
  
  -- Insert into auth.users
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_user_meta_data
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    p_email,
    v_encrypted_password,
    NOW(),
    NOW(),
    NOW(),
    jsonb_build_object('full_name', p_full_name, 'role', p_role)
  )
  RETURNING id INTO v_user_id;
  
  -- Create profile
  INSERT INTO public.profiles (id, email, full_name, updated_at)
  VALUES (v_user_id, p_email, p_full_name, NOW())
  ON CONFLICT (id) DO UPDATE SET full_name = p_full_name;
  
  -- Create user_role
  INSERT INTO public.user_roles (user_id, email, full_name, role, is_active, created_at, updated_at)
  VALUES (v_user_id, p_email, p_full_name, p_role, true, NOW(), NOW())
  ON CONFLICT (email) DO UPDATE SET role = p_role, user_id = v_user_id;
  
  RETURN json_build_object(
    'success', true,
    'user_id', v_user_id,
    'email', p_email,
    'message', 'User created successfully'
  );
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM,
    'message', 'Failed to create user'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant access to authenticated users
GRANT EXECUTE ON FUNCTION create_user_with_password(TEXT, TEXT, TEXT, TEXT) TO authenticated;
