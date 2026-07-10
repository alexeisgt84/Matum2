-- Migración para habilitar y configurar políticas RLS de administración en evolution_servers

-- 1. Habilitar seguridad de nivel de fila (RLS) en la tabla
ALTER TABLE evolution_servers ENABLE ROW LEVEL SECURITY;

-- 2. Eliminar política si ya existe para evitar colisiones
DROP POLICY IF EXISTS "Admins can manage evolution_servers" ON evolution_servers;

-- 3. Crear política para otorgar control total (ALL) a administradores
CREATE POLICY "Admins can manage evolution_servers" 
    ON evolution_servers FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );
