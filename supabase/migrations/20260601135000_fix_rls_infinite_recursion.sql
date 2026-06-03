-- Migración para corregir la recursión infinita en las políticas RLS de catalogs, catalog_members y followed_catalogs

-- 1. Crear función SECURITY DEFINER para verificar si el usuario es dueño del catálogo sin activar RLS
CREATE OR REPLACE FUNCTION public.is_catalog_owner(catalog_id UUID, user_id UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.catalogs
    WHERE id = catalog_id AND catalogs.user_id = $2
  );
END;
$$ LANGUAGE plpgsql;

-- 2. Reemplazar políticas de catalog_members
DROP POLICY IF EXISTS "Users can view memberships they belong to or own" ON public.catalog_members;
CREATE POLICY "Users can view memberships they belong to or own"
    ON public.catalog_members
    FOR SELECT
    USING (
        user_id = auth.uid() OR
        public.is_catalog_owner(catalog_id, auth.uid())
    );

DROP POLICY IF EXISTS "Owners can manage catalog members" ON public.catalog_members;
CREATE POLICY "Owners can manage catalog members"
    ON public.catalog_members
    FOR ALL
    USING (
        public.is_catalog_owner(catalog_id, auth.uid())
    );

-- 3. Reemplazar políticas de followed_catalogs
DROP POLICY IF EXISTS "Users can view their followed catalogs or pending invites" ON public.followed_catalogs;
CREATE POLICY "Users can view their followed catalogs or pending invites"
    ON public.followed_catalogs
    FOR SELECT
    USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() AND users.phone = followed_catalogs.invited_phone
        ) OR
        public.is_catalog_owner(catalog_id, auth.uid())
    );

DROP POLICY IF EXISTS "Users can insert follows or owner can invite" ON public.followed_catalogs;
CREATE POLICY "Users can insert follows or owner can invite"
    ON public.followed_catalogs
    FOR INSERT
    WITH CHECK (
        (user_id = auth.uid() AND status = 'accepted') OR
        public.is_catalog_owner(catalog_id, auth.uid())
    );
