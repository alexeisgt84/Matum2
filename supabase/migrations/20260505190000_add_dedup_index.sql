-- Migración para añadir índice de deduplicación en wa_message_queue
-- Este índice optimiza las consultas que verifican si ya existe un mensaje
-- similar (mismo catálogo, grupo, estado y tiempo de creación) antes de insertar.

-- Índice compuesto para búsquedas rápidas de deduplicación
CREATE INDEX IF NOT EXISTS idx_wa_queue_dedup 
ON wa_message_queue (catalog_id, group_id, status, created_at DESC);

-- Añadir estado 'cancelled' al check constraint si no existe
-- (El cron-message-sender ya usa 'cancelled' pero el constraint original no lo incluye)
ALTER TABLE wa_message_queue DROP CONSTRAINT IF EXISTS wa_message_queue_status_check;
ALTER TABLE wa_message_queue ADD CONSTRAINT wa_message_queue_status_check 
  CHECK (status IN ('pending', 'sent', 'error', 'cancelled'));
