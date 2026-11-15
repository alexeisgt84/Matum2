-- Asegurar que el bucket "products" existe y es público para lectura
INSERT INTO storage.buckets (id, name, public)
VALUES ('products', 'products', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Actualizar políticas de RLS en storage.objects para el bucket "products"
-- usando el rol "authenticated" y (select auth.uid()) IS NOT NULL tanto en USING como en WITH CHECK
ALTER POLICY "Auth Upload" ON storage.objects
TO authenticated
WITH CHECK (
  bucket_id = 'products'
  AND (select auth.uid()) IS NOT NULL
);

ALTER POLICY "Auth Update Delete" ON storage.objects
TO authenticated
USING (
  bucket_id = 'products'
  AND (select auth.uid()) IS NOT NULL
)
WITH CHECK (
  bucket_id = 'products'
  AND (select auth.uid()) IS NOT NULL
);
