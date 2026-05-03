-- Migración para añadir soporte de múltiples horarios de secuencia
ALTER TABLE catalogs 
ADD COLUMN IF NOT EXISTS sequence_schedules JSONB DEFAULT '[]'::jsonb;

-- Comentario informativo
COMMENT ON COLUMN catalogs.sequence_schedules IS 'Lista de horarios programados para la secuencia: [{time: string, enabled: boolean, last_sent_at: string}]';
