-- Ensure app_users table and functions exist for user management
-- This applies the SUPER_SIMPLE_USER_MANAGEMENT setup

-- 1. Create app_users table if not exists
CREATE TABLE IF NOT EXISTS app_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'seller', 'accounts')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- 2. Enable RLS and create policies
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON app_users;
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON app_users;

-- Create simple policies
CREATE POLICY "Enable read access for authenticated users" ON app_users
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable all operations for authenticated users" ON app_users
    FOR ALL USING (auth.role() = 'authenticated');

-- 3. Create authentication function
CREATE OR REPLACE FUNCTION authenticate_app_user(
    p_username VARCHAR(50),
    p_password TEXT
) RETURNS JSON AS $$
DECLARE
    user_data RECORD;
    password_hash TEXT;
BEGIN
    -- Generate password hash
    password_hash := encode(digest(p_password, 'sha256'), 'hex');
    
    -- Get user data
    SELECT id, username, full_name, role, is_active, created_at
    INTO user_data
    FROM app_users
    WHERE username = p_username 
    AND password_hash = password_hash
    AND is_active = true;
    
    IF FOUND THEN
        RETURN json_build_object(
            'success', true,
            'user', json_build_object(
                'id', user_data.id,
                'username', user_data.username,
                'full_name', user_data.full_name,
                'role', user_data.role,
                'is_active', user_data.is_active,
                'created_at', user_data.created_at
            )
        );
    ELSE
        RETURN json_build_object('success', false, 'message', 'Invalid credentials');
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create user management functions
CREATE OR REPLACE FUNCTION create_app_user(
    p_username VARCHAR(50),
    p_full_name VARCHAR(100),
    p_password TEXT,
    p_role VARCHAR(20)
) RETURNS JSON AS $$
DECLARE
    new_user_id UUID;
    password_hash TEXT;
BEGIN
    -- Generate password hash (simple encoding)
    password_hash := encode(digest(p_password, 'sha256'), 'hex');
    
    -- Insert new user
    INSERT INTO app_users (username, full_name, password_hash, role, created_by)
    VALUES (p_username, p_full_name, password_hash, p_role, auth.uid())
    RETURNING id INTO new_user_id;
    
    RETURN json_build_object(
        'success', true, 
        'user_id', new_user_id,
        'message', 'User created successfully'
    );
EXCEPTION
    WHEN unique_violation THEN
        RETURN json_build_object('success', false, 'message', 'Username already exists');
    WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'message', 'Error creating user: ' || SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION update_app_user(
    p_user_id UUID,
    p_full_name VARCHAR(100) DEFAULT NULL,
    p_role VARCHAR(20) DEFAULT NULL,
    p_password TEXT DEFAULT NULL,
    p_is_active BOOLEAN DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
    password_hash TEXT;
BEGIN
    -- Update user
    UPDATE app_users SET
        full_name = COALESCE(p_full_name, full_name),
        role = COALESCE(p_role, role),
        password_hash = CASE 
            WHEN p_password IS NOT NULL THEN encode(digest(p_password, 'sha256'), 'hex')
            ELSE password_hash
        END,
        is_active = COALESCE(p_is_active, is_active),
        updated_at = NOW()
    WHERE id = p_user_id;
    
    IF FOUND THEN
        RETURN json_build_object('success', true, 'message', 'User updated successfully');
    ELSE
        RETURN json_build_object('success', false, 'message', 'User not found');
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Insert default admin user if not exists
INSERT INTO app_users (username, full_name, password_hash, role, is_active)
SELECT 'admin', 'Administrator', encode(digest('admin123', 'sha256'), 'hex'), 'admin', true
WHERE NOT EXISTS (SELECT 1 FROM app_users WHERE username = 'admin');

-- 6. Grant permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'App users system set up successfully!';
    RAISE NOTICE 'Default admin user: admin / admin123';
END $$;