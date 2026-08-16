-- Security hardening applied to the live BarberMaster database on 2026-08-16.
-- This file documents the current, correct state — it is a record, not something
-- meant to be re-run blindly (some statements are DROP POLICY IF EXISTS / CREATE OR
-- REPLACE, so re-running is safe, but there's no need to unless restoring from scratch).

-- ============================================================
-- 1. profiles: is_admin() no longer treats 'Barbeiro' (regular staff) as admin
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND (role IN ('admin', 'super_admin', 'gerente') OR 'manage_team' = ANY(permissions))
  );
$$;

-- Role-based super admin check (no hardcoded email)
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'super_admin'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO service_role;

-- Removed blanket-open policies that had bypassed every other rule on profiles:
--   DROP POLICY "Allow all auth" ON profiles;              -- true for ALL, any authenticated user
--   DROP POLICY "Profiles public access" ON profiles;      -- true for SELECT, public/anon
--   DROP POLICY "Super Admin & Admins Manage Profiles" ON profiles;  -- hardcoded email + unscoped is_admin()
--   DROP POLICY "Profiles tenant isolation" ON profiles;    -- ALL for any tenant member, no role check

CREATE POLICY "Admins manage own tenant profiles"
ON profiles
FOR ALL
TO authenticated
USING (
  is_super_admin() OR (is_admin() AND tenant_id = get_curr_tenant_id())
)
WITH CHECK (
  is_super_admin() OR (is_admin() AND tenant_id = get_curr_tenant_id())
);

-- Public booking flow needs to list front-of-house staff without a Supabase Auth session.
-- Admin/super_admin/gerente rows stay hidden from this.
CREATE POLICY "Public can view front-of-house staff"
ON profiles
FOR SELECT
TO public
USING (
  role IN ('barber', 'Barbeiro', 'Master Barber', 'Recepcionista', 'receptionist')
);

-- Remaining policies kept as-is: "Authenticated can view profiles" (SELECT, authenticated, true)
-- and "Users can update their own profiles" (UPDATE, auth.uid() = id).

-- ============================================================
-- 2. Cross-tenant data leak: clients / comandas / comanda_items / products /
--    services / transactions all had an "Allow all auth" (true, ALL, authenticated)
--    policy that bypassed the correct tenant_id isolation policy sitting next to it.
--    Removed on all six tables. "services" had no isolation policy at all besides the
--    bypass, so one was added.
-- ============================================================
-- DROP POLICY "Allow all auth" ON clients;
-- DROP POLICY "Allow all auth" ON comandas;
-- DROP POLICY "Allow all auth" ON comanda_items;
-- DROP POLICY "Allow all auth" ON products;
-- DROP POLICY "Allow all auth" ON transactions;
-- DROP POLICY "Nuclear Delete Policy" ON clients;          -- any authenticated user could delete any client
-- DROP POLICY "Allow all auth" ON services;

CREATE POLICY "Services tenant isolation"
ON services
FOR ALL
TO authenticated
USING (tenant_id = get_curr_tenant_id())
WITH CHECK (tenant_id = get_curr_tenant_id());

-- ============================================================
-- 3. Client-facing (phone-only login) foundation for a real per-client access token.
--    Login is still just a phone number (no SMS/OTP), but reads/writes of a client's
--    own row will require a secret token instead of being open to anyone with the
--    public anon key. Frontend wiring is a separate, in-progress step — see
--    task tracker; the old open clients policies (view/insert/update = true) are
--    intentionally NOT dropped yet, to avoid breaking the app before the frontend
--    sends the token.
-- ============================================================
ALTER TABLE clients ADD COLUMN IF NOT EXISTS access_token UUID NOT NULL DEFAULT gen_random_uuid();
CREATE UNIQUE INDEX IF NOT EXISTS clients_access_token_idx ON clients(access_token);

CREATE OR REPLACE FUNCTION client_login_by_phone(p_tenant_id UUID, p_phone TEXT)
RETURNS TABLE (
  id UUID, name TEXT, email TEXT, phone TEXT, avatar TEXT,
  total_visits INT, loyalty_points INT, access_token UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT c.id, c.name, c.email, c.phone, c.avatar,
         c.total_visits, c.loyalty_points, c.access_token
  FROM clients c
  WHERE c.tenant_id = p_tenant_id AND c.phone = p_phone
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION client_login_by_phone(UUID, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION client_login_by_phone(UUID, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION client_register(p_tenant_id UUID, p_phone TEXT, p_name TEXT)
RETURNS TABLE (
  id UUID, name TEXT, email TEXT, phone TEXT, avatar TEXT,
  total_visits INT, loyalty_points INT, access_token UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  SELECT c.id INTO v_id FROM clients c WHERE c.tenant_id = p_tenant_id AND c.phone = p_phone;

  IF v_id IS NULL THEN
    INSERT INTO clients (name, phone, tenant_id, total_visits, loyalty_points)
    VALUES (p_name, p_phone, p_tenant_id, 0, 0)
    RETURNING clients.id INTO v_id;
  END IF;

  RETURN QUERY
  SELECT c.id, c.name, c.email, c.phone, c.avatar,
         c.total_visits, c.loyalty_points, c.access_token
  FROM clients c WHERE c.id = v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION client_register(UUID, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION client_register(UUID, TEXT, TEXT) TO authenticated;

-- TODO (next step): once the client-facing pages send `access_token` on every request,
-- replace the open policies on `clients` (view/insert/update = true) with checks against
-- this token, and tighten "Allow public read/update on appointments" the same way.
