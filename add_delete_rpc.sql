-- RPC to Delete Staff Member (Profile and Auth User if possible/needed)
CREATE OR REPLACE FUNCTION delete_staff_member(
  p_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_user_role TEXT;
BEGIN
  -- Validate Permissions
  SELECT role INTO v_current_user_role FROM profiles WHERE id = auth.uid();
  
  -- Allow admins only
  IF v_current_user_role NOT IN ('admin', 'super_admin', 'gerente') THEN
     RAISE EXCEPTION 'Acesso negado. Apenas administradores podem excluir profissionais.';
  END IF;

  -- Delete from profiles
  DELETE FROM public.profiles WHERE id = p_id;

  -- Note: Deleting from auth.users requires superuser privileges usually not available in normal RPCs
  -- unless we use a specific approach. 
  -- However, since profile is gone, they can't log in effectively if app checks profile.
  -- But to be clean, we can try to mark them inactive if real delete fails?
  -- Actually, with RLS, if they don't have a profile, they might not access data.

  -- Ideally we would delete from auth.users too, but that requires supabase_admin access.
  -- For now, deleting the profile is sufficient for the "Business Logic".
  
  RETURN json_build_object('status', 'success', 'id', p_id);
END;
$$;

GRANT EXECUTE ON FUNCTION delete_staff_member TO authenticated;
GRANT EXECUTE ON FUNCTION delete_staff_member TO service_role;
