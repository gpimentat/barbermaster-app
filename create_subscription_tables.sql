-- =========================================
-- MIGRATION: Subscription System Tables
-- =========================================

-- 1. Subscription Plans Table
CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  frequency TEXT NOT NULL DEFAULT 'monthly', -- 'monthly', 'quarterly', 'yearly'
  features TEXT[] DEFAULT '{}',
  active BOOLEAN DEFAULT true,
  gateway_plan_id TEXT, -- ID no Mercado Pago/Stripe
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscription_plans_tenant ON subscription_plans(tenant_id);
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

-- 2. Service Packages Table
CREATE TABLE IF NOT EXISTS service_packages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  validity_days INTEGER DEFAULT 30,
  features TEXT[] DEFAULT '{}',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_service_packages_tenant ON service_packages(tenant_id);
ALTER TABLE service_packages ENABLE ROW LEVEL SECURITY;

-- 3. Client Subscriptions Table
CREATE TABLE IF NOT EXISTS client_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  plan_id UUID REFERENCES subscription_plans(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'pending', -- 'active', 'inactive', 'past_due', 'canceled', 'pending'
  gateway_subscription_id TEXT,
  renews_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_subs_tenant ON client_subscriptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_client_subs_client ON client_subscriptions(client_id);
ALTER TABLE client_subscriptions ENABLE ROW LEVEL SECURITY;

-- 4. Client Packages Table
CREATE TABLE IF NOT EXISTS client_packages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  package_id UUID REFERENCES service_packages(id) ON DELETE SET NULL,
  purchased_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  remaining_uses JSONB DEFAULT '{}', -- mapping of service_id -> count
  status TEXT DEFAULT 'active', -- 'active', 'used', 'expired'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_pkgs_tenant ON client_packages(tenant_id);
CREATE INDEX IF NOT EXISTS idx_client_pkgs_client ON client_packages(client_id);
ALTER TABLE client_packages ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
-- Owners can manage their own plans/packages
CREATE POLICY "Owners can manage own subscription plans" ON subscription_plans
    FOR ALL USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

CREATE POLICY "Owners can manage own service packages" ON service_packages
    FOR ALL USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

CREATE POLICY "Owners can manage client subscriptions" ON client_subscriptions
    FOR ALL USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

CREATE POLICY "Owners can manage client packages" ON client_packages
    FOR ALL USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- Public/Clients can view active plans/packages
CREATE POLICY "Public can view active subscription plans" ON subscription_plans
    FOR SELECT USING (active = true);

CREATE POLICY "Public can view active service packages" ON service_packages
    FOR SELECT USING (active = true);
