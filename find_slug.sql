-- SQL para descobrir o slug da sua barbearia
-- Execute isso no Supabase SQL Editor

SELECT 
  id,
  name,
  slug,
  'http://localhost:3000/#/app/' || slug as url_app
FROM tenants
ORDER BY created_at DESC;
