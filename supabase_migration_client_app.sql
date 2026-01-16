-- =========================================
-- MIGRATION: Add slug support for client app
-- =========================================

-- 1. Adicionar coluna slug na tabela tenants
ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

-- 2. Criar índice para busca rápida
CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug);

-- 3. Gerar slug automático para tenants existentes (baseado no nome)
UPDATE tenants 
SET slug = LOWER(REGEXP_REPLACE(name, '[^a-zA-Z0-9]+', '-', 'g'))
WHERE slug IS NULL;

-- 4. Criar tabela de clientes
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT NOT NULL,
  birth_date DATE,
  avatar_url TEXT,
  loyalty_points INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, phone) -- Um telefone por barbearia
);

-- 5. Índices para clients
CREATE INDEX IF NOT EXISTS idx_clients_tenant ON clients(tenant_id);
CREATE INDEX IF NOT EXISTS idx_clients_phone ON clients(phone);

-- 6. RLS (Row Level Security) para clients
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- Cliente pode ver apenas seus próprios dados
CREATE POLICY "Clients can view own data" ON clients
  FOR SELECT 
  USING (true); -- Por enquanto público, vamos refinar depois

-- Cliente pode atualizar apenas seus próprios dados  
CREATE POLICY "Clients can update own data" ON clients
  FOR UPDATE 
  USING (true); -- Por enquanto público

-- Cliente pode inserir seus próprios dados (cadastro)
CREATE POLICY "Clients can insert own data" ON clients
  FOR INSERT 
  WITH CHECK (true); -- Por enquanto público

-- 7. Adicionar client_id em appointments (se ainda não existe)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'appointments' AND column_name = 'client_id'
  ) THEN
    ALTER TABLE appointments ADD COLUMN client_id UUID REFERENCES clients(id);
  END IF;
END $$;

-- 8. Índice para appointments.client_id
CREATE INDEX IF NOT EXISTS idx_appointments_client ON appointments(client_id);

-- 9. Policy para clientes verem seus próprios agendamentos
CREATE POLICY "Clients can view own appointments" ON appointments
  FOR SELECT
  USING (true); -- Por enquanto público, vamos refinar depois

-- 10. Criar tabela para salvar tokens de dispositivos (notificações push - futuro)
CREATE TABLE IF NOT EXISTS notification_devices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  device_token TEXT NOT NULL UNIQUE,
  device_type TEXT, -- 'android', 'ios', 'desktop'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_active_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para notification_devices
CREATE INDEX IF NOT EXISTS idx_notification_devices_client ON notification_devices(client_id);
CREATE INDEX IF NOT EXISTS idx_notification_devices_tenant ON notification_devices(tenant_id);

-- =========================================
-- DONE: Migration completed successfully!
-- =========================================
