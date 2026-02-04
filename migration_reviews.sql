-- =========================================
-- MIGRATION: Client Reviews & Feedback
-- =========================================

-- 1. Create Reviews Table
CREATE TABLE IF NOT EXISTS client_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  client_name TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  photo_url TEXT,
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_reviews_tenant ON client_reviews(tenant_id);
CREATE INDEX IF NOT EXISTS idx_client_reviews_status ON client_reviews(status);

-- 2. RLS Policies for Reviews
ALTER TABLE client_reviews ENABLE ROW LEVEL SECURITY;

-- Clients/Public can insert (submission)
CREATE POLICY "Public can submit reviews" ON client_reviews
  FOR INSERT WITH CHECK (true);

-- Everyone can view approved reviews
CREATE POLICY "Public can view approved reviews" ON client_reviews
  FOR SELECT USING (status = 'approved');

-- Owners can manage all reviews for their tenant
CREATE POLICY "Owners can manage own reviews" ON client_reviews
  FOR ALL USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- 3. Storage for Review Photos
-- Create bucket (run through SQL editor)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('reviews', 'reviews', true)
ON CONFLICT (id) DO NOTHING;

-- Policy: Allow anyone to upload to reviews (public submission)
CREATE POLICY "Public Can Upload Review Photos" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'reviews');

-- Policy: Everyone can view review photos
CREATE POLICY "Public Can View Review Photos" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'reviews');
