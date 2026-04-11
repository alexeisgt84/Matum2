-- Ejecutar esto en el SQL Editor de Supabase si el toggle sigue sin funcionar
ALTER TABLE catalogs 
ADD COLUMN IF NOT EXISTS is_individual_scheduled BOOLEAN DEFAULT false;

COMMENT ON COLUMN catalogs.is_individual_scheduled IS 'Interruptor para permitir o prohibir envíos automáticos de mensajes individuales';
