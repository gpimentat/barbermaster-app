-- 1. Drop existing constraints
ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_client_id_fkey;
ALTER TABLE comandas DROP CONSTRAINT IF EXISTS comandas_client_id_fkey;
ALTER TABLE waitlist DROP CONSTRAINT IF EXISTS waitlist_client_id_fkey;
ALTER TABLE notification_devices DROP CONSTRAINT IF EXISTS notification_devices_client_id_fkey;

-- 2. Re-create them with ON DELETE CASCADE
ALTER TABLE appointments 
    ADD CONSTRAINT appointments_client_id_fkey 
    FOREIGN KEY (client_id) 
    REFERENCES clients(id) 
    ON DELETE CASCADE;

ALTER TABLE comandas 
    ADD CONSTRAINT comandas_client_id_fkey 
    FOREIGN KEY (client_id) 
    REFERENCES clients(id) 
    ON DELETE CASCADE;

ALTER TABLE waitlist 
    ADD CONSTRAINT waitlist_client_id_fkey 
    FOREIGN KEY (client_id) 
    REFERENCES clients(id) 
    ON DELETE CASCADE;

ALTER TABLE notification_devices 
    ADD CONSTRAINT notification_devices_client_id_fkey 
    FOREIGN KEY (client_id) 
    REFERENCES clients(id) 
    ON DELETE CASCADE;
