-- Script to reset passwords for existing staff members
-- This will allow them to login with the default password "1234"
-- Run this ONCE after deploying the Edge Function

-- Note: This script documents the staff that need password resets
-- The actual password reset should be done via the Supabase Dashboard or Admin API

-- List of staff members that need password reset:
SELECT 
  p.id,
  p.name,
  p.email,
  p.role,
  'Password needs reset to: 1234' as action
FROM profiles p
INNER JOIN auth.users u ON p.id = u.id
WHERE p.login_enabled = true
  AND p.role IN ('Barbeiro', 'Recepcionista', 'Gerente')
  AND u.created_at IS NULL; -- These were created manually via SQL

-- To reset passwords, use one of these methods:
-- 
-- METHOD 1: Via Supabase Dashboard
-- 1. Go to Authentication > Users
-- 2. Find each user by email
-- 3. Click the user
-- 4. Click "Send Password Recovery"
-- 5. Or manually set password to "1234"
--
-- METHOD 2: Via SQL (requires service_role key in a secure environment)
-- This is handled by the Edge Function for new users
-- For existing users, they can use "Forgot Password" or admin can reset via dashboard
--
-- METHOD 3: Create a one-time admin script
-- See reset_staff_passwords.js for implementation

COMMENT ON TABLE profiles IS 'After running this query, reset passwords via Supabase Dashboard or use the reset_staff_passwords.js script';
