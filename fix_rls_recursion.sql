-- Fix RLS Recursion on Profiles Table

-- 1. Create a secure function to check admin status (Bypasses RLS)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND (role IN ('admin', 'super_admin', 'gerente', 'Barbeiro') OR 'manage_team' = ANY(permissions))
  );
$$;

-- 2. Drop the recursive policy
DROP POLICY IF EXISTS "Admins can manage all profiles" ON profiles;

-- 3. Re-create policy using the function (No recursion for SELECTs)
CREATE POLICY "Admins can manage all profiles"
ON profiles
FOR ALL
USING (
  public.is_admin()
);

-- Ensure "Authenticated can view profiles" exists and is simple
DROP POLICY IF EXISTS "Authenticated can view profiles" ON profiles;
CREATE POLICY "Authenticated can view profiles"
ON profiles
FOR SELECT
TO authenticated
USING (true);

-- Grant access to the function
GRANT EXECUTE ON FUNCTION public.is_admin TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin TO service_role;
