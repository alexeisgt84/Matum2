-- Migración para Colaboración en Catálogos y Seguimiento por Invitación

-- 1. Crear tabla catalog_members
CREATE TABLE IF NOT EXISTS public.catalog_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    catalog_id UUID NOT NULL REFERENCES public.catalogs(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    invited_phone TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'collaborator' CHECK (role IN ('owner', 'collaborator')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (catalog_id, invited_phone)
);

-- Habilitar RLS en catalog_members
ALTER TABLE public.catalog_members ENABLE ROW LEVEL SECURITY;

-- 2. Políticas RLS para catalog_members
CREATE POLICY "Users can view memberships they belong to or own"
    ON public.catalog_members
    FOR SELECT
    USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.catalogs
            WHERE catalogs.id = catalog_members.catalog_id AND catalogs.user_id = auth.uid()
        )
    );

CREATE POLICY "Owners can manage catalog members"
    ON public.catalog_members
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.catalogs
            WHERE catalogs.id = catalog_members.catalog_id AND catalogs.user_id = auth.uid()
        )
    );

CREATE POLICY "Invited members can update their own invitation status"
    ON public.catalog_members
    FOR UPDATE
    USING (
        user_id = auth.uid() OR
        (user_id IS NULL AND EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid() AND users.phone = catalog_members.invited_phone
        ))
    )
    WITH CHECK (
        status IN ('accepted', 'rejected')
    );

-- 3. Modificaciones en followed_catalogs
ALTER TABLE public.followed_catalogs 
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'accepted' CHECK (status IN ('pending', 'accepted', 'rejected')),
ADD COLUMN IF NOT EXISTS invited_phone TEXT;

-- Permitir nulos en user_id para registrar invitaciones a usuarios no registrados
ALTER TABLE public.followed_catalogs ALTER COLUMN user_id DROP NOT NULL;

-- 4. Modificar políticas RLS en followed_catalogs
DROP POLICY IF EXISTS "Users can view their own followed catalogs" ON public.followed_catalogs;
DROP POLICY IF EXISTS "Users can follow catalogs" ON public.followed_catalogs;

CREATE POLICY "Users can view their followed catalogs or pending invites"
    ON public.followed_catalogs
    FOR SELECT
    USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() AND users.phone = followed_catalogs.invited_phone
        ) OR
        EXISTS (
            SELECT 1 FROM public.catalogs
            WHERE catalogs.id = followed_catalogs.catalog_id AND catalogs.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert follows or owner can invite"
    ON public.followed_catalogs
    FOR INSERT
    WITH CHECK (
        -- El usuario sigue por su cuenta (código de seguimiento)
        (user_id = auth.uid() AND status = 'accepted') OR
        -- El dueño invita a un seguidor por teléfono
        EXISTS (
            SELECT 1 FROM public.catalogs
            WHERE catalogs.id = followed_catalogs.catalog_id AND catalogs.user_id = auth.uid()
        )
    );

CREATE POLICY "Follower can accept/reject pending follow"
    ON public.followed_catalogs
    FOR UPDATE
    USING (
        user_id = auth.uid() OR
        (user_id IS NULL AND EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid() AND users.phone = followed_catalogs.invited_phone
        ))
    )
    WITH CHECK (
        status IN ('accepted', 'rejected')
    );

-- 5. Trigger para asociar automáticamente registros huérfanos cuando se registre/actualice el teléfono de un usuario
CREATE OR REPLACE FUNCTION link_pending_invitations() 
RETURNS TRIGGER AS $$
BEGIN
    -- Enlazar invitaciones a colaboradores
    UPDATE public.catalog_members
    SET user_id = NEW.id
    WHERE invited_phone = NEW.phone AND user_id IS NULL;

    -- Enlazar invitaciones a seguidores
    UPDATE public.followed_catalogs
    SET user_id = NEW.id
    WHERE invited_phone = NEW.phone AND user_id IS NULL;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_link_pending_invitations ON public.users;
CREATE TRIGGER trigger_link_pending_invitations
AFTER INSERT OR UPDATE OF phone ON public.users
FOR EACH ROW
EXECUTE FUNCTION link_pending_invitations();

-- 6. Políticas RLS en catalogs para colaboradores
CREATE POLICY "Collaborators can view catalogs they are accepted to"
    ON public.catalogs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.catalog_members
            WHERE catalog_members.catalog_id = catalogs.id
              AND catalog_members.user_id = auth.uid()
              AND catalog_members.status = 'accepted'
        )
    );

-- 7. Políticas RLS en products para colaboradores
CREATE POLICY "Collaborators can view products of shared catalogs"
    ON public.products
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.catalog_members
            WHERE catalog_members.catalog_id = products.catalog_id
              AND catalog_members.user_id = auth.uid()
              AND catalog_members.status = 'accepted'
        )
    );

CREATE POLICY "Collaborators can insert products in shared catalogs"
    ON public.products
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.catalog_members
            WHERE catalog_members.catalog_id = products.catalog_id
              AND catalog_members.user_id = auth.uid()
              AND catalog_members.status = 'accepted'
        )
    );

CREATE POLICY "Collaborators can update products in shared catalogs"
    ON public.products
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.catalog_members
            WHERE catalog_members.catalog_id = products.catalog_id
              AND catalog_members.user_id = auth.uid()
              AND catalog_members.status = 'accepted'
        )
    );

CREATE POLICY "Collaborators can delete products in shared catalogs"
    ON public.products
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.catalog_members
            WHERE catalog_members.catalog_id = products.catalog_id
              AND catalog_members.user_id = auth.uid()
              AND catalog_members.status = 'accepted'
        )
    );
