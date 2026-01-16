-- Function to delete a single client and ALL their dependencies
CREATE OR REPLACE FUNCTION delete_client_fully(target_client_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
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
CREATE OR REPLACE FUNCTION delete_all_clients_fully(target_tenant_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 1. Delete dependencies for all clients in this tenant
  -- Note: We filter by checking if the client belongs to the tenant
  
  DELETE FROM appointments 
  WHERE client_id IN (SELECT id FROM clients WHERE tenant_id = target_tenant_id);

  DELETE FROM comandas 
  WHERE client_id IN (SELECT id FROM clients WHERE tenant_id = target_tenant_id);
  
  DELETE FROM waitlist 
  WHERE client_id IN (SELECT id FROM clients WHERE tenant_id = target_tenant_id);

  DELETE FROM notification_devices 
  WHERE client_id IN (SELECT id FROM clients WHERE tenant_id = target_tenant_id);
  
  -- 2. Delete all clients for this tenant
  DELETE FROM clients 
  WHERE tenant_id = target_tenant_id 
  AND id != '00000000-0000-0000-0000-000000000000';
END;
$$;

-- Grant permissions immediately
GRANT EXECUTE ON FUNCTION delete_client_fully(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_client_fully(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION delete_client_fully(uuid) TO postgres;
GRANT EXECUTE ON FUNCTION delete_client_fully(uuid) TO anon;

GRANT EXECUTE ON FUNCTION delete_all_clients_fully(text) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_all_clients_fully(text) TO service_role;
GRANT EXECUTE ON FUNCTION delete_all_clients_fully(text) TO postgres;
GRANT EXECUTE ON FUNCTION delete_all_clients_fully(text) TO anon;
