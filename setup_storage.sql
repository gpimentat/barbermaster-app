-- Enable Storage
INSERT INTO storage.buckets (id, name, public) 
VALUES ('app-assets', 'app-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Policy: Authenticated users can upload
CREATE POLICY "Authenticated Users Can Upload" 
ON storage.objects 
FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'app-assets');

-- Policy: Everyone can view
CREATE POLICY "Public Can View" 
ON storage.objects 
FOR SELECT 
TO public 
USING (bucket_id = 'app-assets');

-- Policy: Users can update their own files (optional, good for overwrites)
CREATE POLICY "Users Can Update Own Files" 
ON storage.objects 
FOR UPDATE 
TO authenticated 
USING (bucket_id = 'app-assets' AND auth.uid() = owner);
