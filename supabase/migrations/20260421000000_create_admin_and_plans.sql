
-- 1. Crear tipo enumerado para roles (opcional pero recomendado)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('user', 'admin');
    END IF;
END $$;

-- 2. Agregar columna role a la tabla users
ALTER TABLE users ADD COLUMN IF NOT EXISTS role user_role DEFAULT 'user';

-- 3. Crear tabla de planes de suscripción
CREATE TABLE IF NOT EXISTS subscription_plans (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    price_cup NUMERIC DEFAULT 0,
    price_usd NUMERIC DEFAULT 0,
    catalogs_limit INTEGER NOT NULL,
    products_limit INTEGER NOT NULL,
    groups_limit INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Habilitar RLS en subscription_plans
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

-- 5. Políticas para subscription_plans
-- Cualquiera puede ver los planes activos
CREATE POLICY "Anyone can view active plans" 
    ON subscription_plans FOR SELECT 
    USING (is_active = true);

-- Solo administradores pueden gestionar planes
CREATE POLICY "Admins can manage plans" 
    ON subscription_plans FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- 6. Insertar planes iniciales
INSERT INTO subscription_plans (id, name, description, price_cup, catalogs_limit, products_limit, groups_limit)
VALUES 
    ('free', 'Gratis', 'Plan básico para comenzar', 0, 1, 8, 1),
    ('basic', 'Básico', 'Para emprendedores pequeños', 500, 2, 50, 2),
    ('pro', 'Profesional', 'Para negocios en crecimiento', 1500, 3, 200, 3),
    ('premium', 'Premium', 'Control total de tu negocio', 3000, 4, 500, 5)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    catalogs_limit = EXCLUDED.catalogs_limit,
    products_limit = EXCLUDED.products_limit,
    groups_limit = EXCLUDED.groups_limit;

-- 7. Trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_subscription_plans_updated_at
    BEFORE UPDATE ON subscription_plans
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();
