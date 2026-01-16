GRANT EXECUTE ON FUNCTION delete_client_fully(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_all_clients_fully(text) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_client_fully(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION delete_all_clients_fully(text) TO service_role;
