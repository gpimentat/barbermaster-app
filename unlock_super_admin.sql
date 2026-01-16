-- Unlock Super Admin Access (Ultimate Fix)
-- Directly permits g.pimentat@gmail.com to do ANYTHING on profiles, bypassing role checks.

DROP POLICY IF EXISTS "Admins can manage all profiles" ON profiles;

CREATE POLICY "Super Admin & Admins Manage Profiles"
ON profiles
FOR ALL
TO authenticated
USING (
  (auth.jwt() ->> 'email') = 'g.pimentat@gmail.com' 
  OR public.is_admin() IS TRUE
)
WITH CHECK (
  (auth.jwt() ->> 'email') = 'g.pimentat@gmail.com' 
  OR public.is_admin() IS TRUE
);
