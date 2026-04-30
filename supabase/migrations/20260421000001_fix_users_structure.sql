-- Asegurar que la tabla users tenga la columna plan y role correctamente configuradas
ALTER TABLE users ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'free' REFERENCES subscription_plans(id);

-- Actualizar usuarios existentes que no tengan plan
UPDATE users SET plan = 'free' WHERE plan IS NULL;

-- Asegurar que role sea del tipo user_role
-- (El tipo y la columna role ya fueron creados en la migración anterior, pero esto refuerza la consistencia)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('user', 'admin');
    END IF;
END $$;

ALTER TABLE users ALTER COLUMN role SET DEFAULT 'user';
