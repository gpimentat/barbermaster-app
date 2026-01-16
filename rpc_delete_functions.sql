-- Function to delete a single client and their appointments
CREATE OR REPLACE FUNCTION delete_client_fully(target_client_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with admin privileges to bypass strict FK/RLS complexities momentarily, but we filter by ID
AS $$
BEGIN
  -- 1. Delete appointments for this specific client
  DELETE FROM appointments WHERE client_id = target_client_id;
  
  -- 2. Delete the client
  DELETE FROM clients WHERE id = target_client_id;
END;
$$;

-- Function to delete ALL clients and their appointments for a tenant
CREATE OR REPLACE FUNCTION delete_all_clients_fully(target_tenant_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 1. Delete all appointments for this tenant
  DELETE FROM appointments WHERE tenant_id = target_tenant_id;
  
  -- 2. Delete all clients for this tenant (excluding special ID 00...00 if exists)
  DELETE FROM clients 
  WHERE tenant_id = target_tenant_id 
  AND id != '00000000-0000-0000-0000-000000000000';
END;
$$;
