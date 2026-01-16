-- Add ON DELETE CASCADE to Staff (Profiles) relationships

-- 1. Appointments
ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_barber_id_fkey;
ALTER TABLE appointments 
    ADD CONSTRAINT appointments_barber_id_fkey 
    FOREIGN KEY (barber_id) 
    REFERENCES profiles(id) 
    ON DELETE CASCADE;

-- 2. Waitlist
ALTER TABLE waitlist DROP CONSTRAINT IF EXISTS waitlist_barber_id_fkey;
ALTER TABLE waitlist 
    ADD CONSTRAINT waitlist_barber_id_fkey 
    FOREIGN KEY (barber_id) 
    REFERENCES profiles(id) 
    ON DELETE CASCADE;

-- 3. Comanda Items (Using Set Null to try preserve financial data, or Cascade?)
-- Going with CASCADE for consistency with "Delete Rule". 
-- If user wants history, they should "Deactivate" (Active=false).
ALTER TABLE comanda_items DROP CONSTRAINT IF EXISTS comanda_items_barber_id_fkey;
ALTER TABLE comanda_items 
    ADD CONSTRAINT comanda_items_barber_id_fkey 
    FOREIGN KEY (barber_id) 
    REFERENCES profiles(id) 
    ON DELETE CASCADE;
