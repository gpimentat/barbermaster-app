-- Function to delete a single client and ALL their dependencies
-- SECURITY: only an authenticated admin/gerente/super_admin of the client's own tenant may call this.
CREATE OR REPLACE FUNCTION delete_client_fully(target_client_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
  v_tenant UUID;
  v_client_tenant UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  SELECT role, tenant_id INTO v_role, v_tenant FROM profiles WHERE id = auth.uid();

  IF v_role IS NULL OR v_role NOT IN ('admin','super_admin','gerente') THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  SELECT tenant_id INTO v_client_tenant FROM clients WHERE id = target_client_id;

  IF v_role <> 'super_admin' AND (v_client_tenant IS NULL OR v_client_tenant <> v_tenant) THEN
    RAISE EXCEPTION 'Cliente não pertence ao seu salão';
  END IF;

  -- 1. Delete dependencies in order
  DELETE FROM appointments WHERE client_id = target_client_id;
  DELETE FROM comandas WHERE client_id = target_client_id;
  DELETE FROM waitlist WHERE client_id = target_client_id;
  DELETE FROM notification_devices WHERE client_id = target_client_id;

  -- 2. Delete the client
  DELETE FROM clients WHERE id = target_client_id;
END;
$$;

-- Function to delete ALL clients and ALL their dependencies for a tenant
-- SECURITY: only an authenticated admin/gerente/super_admin of the target tenant may call this.
CREATE OR REPLACE FUNCTION delete_all_clients_fully(target_tenant_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
  v_tenant UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  SELECT role, tenant_id INTO v_role, v_tenant FROM profiles WHERE id = auth.uid();

  IF v_role IS NULL OR v_role NOT IN ('admin','super_admin','gerente') THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  IF v_role <> 'super_admin' AND (v_tenant IS NULL OR v_tenant <> target_tenant_id::uuid) THEN
    RAISE EXCEPTION 'Você só pode apagar clientes do seu próprio salão';
  END IF;

  -- 1. Delete dependencies for all clients in this tenant
  DELETE FROM appointments
  WHERE client_id IN (SELECT id FROM clients WHERE tenant_id = target_tenant_id::uuid);

  DELETE FROM comandas
  WHERE client_id IN (SELECT id FROM clients WHERE tenant_id = target_tenant_id::uuid);

  DELETE FROM waitlist
  WHERE client_id IN (SELECT id FROM clients WHERE tenant_id = target_tenant_id::uuid);

  DELETE FROM notification_devices
  WHERE client_id IN (SELECT id FROM clients WHERE tenant_id = target_tenant_id::uuid);

  -- 2. Delete all clients for this tenant
  DELETE FROM clients
  WHERE tenant_id = target_tenant_id::uuid
  AND id != '00000000-0000-0000-0000-000000000000';
END;
$$;

-- Grant permissions: authenticated only (the function itself enforces admin + tenant checks)
GRANT EXECUTE ON FUNCTION delete_client_fully(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_client_fully(uuid) TO service_role;

GRANT EXECUTE ON FUNCTION delete_all_clients_fully(text) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_all_clients_fully(text) TO service_role;
