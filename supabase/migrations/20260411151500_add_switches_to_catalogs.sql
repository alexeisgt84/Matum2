-- Migración para añadir interruptores de envío automático a los catálogos
ALTER TABLE catalogs 
ADD COLUMN IF NOT EXISTS is_sequence_scheduled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_individual_scheduled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS sequence_start_time TEXT DEFAULT '09:00',
ADD COLUMN IF NOT EXISTS last_sequence_sent_at TIMESTAMPTZ;

-- Comentario informativo para el esquema
COMMENT ON COLUMN catalogs.is_sequence_scheduled IS 'Activa el envío automático de la secuencia de mensajes a la hora programada';
COMMENT ON COLUMN catalogs.is_individual_scheduled IS 'Activa el envío de mensajes individuales programados';
