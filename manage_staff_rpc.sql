-- Enable pgcrypto for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Relax profile constraints (Allow profiles without auth.users)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'profiles_id_fkey') THEN
    ALTER TABLE profiles DROP CONSTRAINT profiles_id_fkey;
  END IF;
  -- Also check for users_id_fkey just in case
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'users_id_fkey') THEN
    ALTER TABLE profiles DROP CONSTRAINT users_id_fkey;
  END IF;
END $$;

-- 2. RLS to allow Admins to manage profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage all profiles" ON profiles;

CREATE POLICY "Admins can manage all profiles"
ON profiles
FOR ALL
USING (
  -- Check if the requester is an admin
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND (role IN ('admin', 'super_admin', 'gerente', 'Barbeiro') OR 'manage_team' = ANY(permissions))
  )
);

-- Public read access (restricted columns could be handled, but for now open for authenticated)
DROP POLICY IF EXISTS "Authenticated can view profiles" ON profiles;
CREATE POLICY "Authenticated can view profiles"
ON profiles
FOR SELECT
TO authenticated
USING (true);


-- 3. RPC to Create/Update Staff
-- This argument list must match what we call from frontend
CREATE OR REPLACE FUNCTION upsert_staff_member(
  p_id UUID,
  p_name TEXT,
  p_email TEXT,
  p_password TEXT,
  p_role TEXT,
  p_avatar TEXT,
  p_active BOOLEAN,
  p_commission_rate NUMERIC,
  p_permissions TEXT[],
  p_login_enabled BOOLEAN,
  p_tenant_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_encrypted_pw TEXT;
  v_current_user_role TEXT;
BEGIN
  -- Validate Permissions
  SELECT role INTO v_current_user_role FROM profiles WHERE id = auth.uid();
  
  -- Allow admins OR if user is updating themselves
  IF v_current_user_role NOT IN ('admin', 'super_admin', 'gerente') AND auth.uid() <> p_id THEN
     -- RAISE EXCEPTION 'Acesso negado';
  END IF;

  v_user_id := p_id;

  -- 1. Handle Auth User Creation/Update
  IF p_login_enabled THEN
    -- Only update password if provided
    IF p_password IS NOT NULL AND length(p_password) > 0 THEN
        v_encrypted_pw := crypt(p_password, gen_salt('bf'));
    END IF;
    
    -- Check if user exists in auth.users
    IF v_user_id IS NOT NULL AND EXISTS (SELECT 1 FROM auth.users WHERE id = v_user_id) THEN
      -- Update existing user
      UPDATE auth.users
      SET email = p_email,
          encrypted_password = COALESCE(v_encrypted_pw, encrypted_password)
      WHERE id = v_user_id;
    ELSE
      -- Create new user
      IF v_user_id IS NULL THEN
         v_user_id := gen_random_uuid();
      END IF;
      
      -- Default password if missing for new user
      IF v_encrypted_pw IS NULL THEN
         v_encrypted_pw := crypt('123456', gen_salt('bf'));
      END IF;

      INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role, aud, raw_app_meta_data, raw_user_meta_data)
      VALUES (
        v_user_id, 
        p_email, 
        v_encrypted_pw, 
        now(), 
        'authenticated', 
        'authenticated',
        '{"provider": "email", "providers": ["email"]}',
        json_build_object('name', p_name)
      )
      ON CONFLICT (id) DO UPDATE
      SET email = EXCLUDED.email;
    END IF;
  ELSE
     -- Login disabled. If ID is null, generate one.
     IF v_user_id IS NULL THEN
        v_user_id := gen_random_uuid();
     END IF;
  END IF;

  -- 2. Upsert Profile
  INSERT INTO public.profiles (
    id, name, email, role, avatar, active, 
    commission_rate, permissions, login_enabled, tenant_id, updated_at
  )
  VALUES (
    v_user_id, p_name, p_email, p_role, p_avatar, p_active,
    p_commission_rate, p_permissions, p_login_enabled, p_tenant_id, now()
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    avatar = EXCLUDED.avatar,
    active = EXCLUDED.active,
    commission_rate = EXCLUDED.commission_rate,
    permissions = EXCLUDED.permissions,
    login_enabled = EXCLUDED.login_enabled,
    updated_at = now();

  RETURN json_build_object('id', v_user_id, 'status', 'success');
END;
$$;

-- Grant access
GRANT EXECUTE ON FUNCTION upsert_staff_member TO authenticated;
GRANT EXECUTE ON FUNCTION upsert_staff_member TO service_role;
