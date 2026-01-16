-- Política RLS para permitir que usuários atualizem seus próprios tenants
-- Execute isso no Supabase SQL Editor

-- 1. Verificar se RLS está habilitado
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

-- 2. Criar política para UPDATE
CREATE POLICY "Users can update own tenant"
ON tenants
FOR UPDATE
USING (
  id IN (
    SELECT tenant_id 
    FROM profiles 
    WHERE id = auth.uid()
  )
)
WITH CHECK (
  id IN (
    SELECT tenant_id 
    FROM profiles 
    WHERE id = auth.uid()
  )
);

-- 3. Criar política para SELECT (se não existir)
CREATE POLICY "Users can view own tenant"
ON tenants
FOR SELECT
USING (
  id IN (
    SELECT tenant_id 
    FROM profiles 
    WHERE id = auth.uid()
  )
);
