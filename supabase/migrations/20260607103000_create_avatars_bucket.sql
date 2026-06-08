-- Crear bucket para avatars si no existe
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de Storage para el bucket "avatars"

-- 1. Permitir acceso público de lectura a los avatares
CREATE POLICY "Avatars are public"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- 2. Permitir a los usuarios autenticados subir sus propios avatares
CREATE POLICY "Authenticated users can upload avatars"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'avatars' 
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 3. Permitir a los usuarios actualizar sus propios avatares
CREATE POLICY "Authenticated users can update avatars"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'avatars' 
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 4. Permitir a los usuarios eliminar sus propios avatares
CREATE POLICY "Authenticated users can delete avatars"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'avatars' 
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
);
