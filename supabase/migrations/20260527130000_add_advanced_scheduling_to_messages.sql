-- Migración para añadir soporte de programación avanzada a mensajes individuales
ALTER TABLE whatsapp_messages 
ADD COLUMN IF NOT EXISTS schedule_type TEXT DEFAULT 'fixed' CHECK (schedule_type IN ('fixed', 'interval')),
ADD COLUMN IF NOT EXISTS schedule_interval INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS fixed_schedules JSONB DEFAULT '[]'::jsonb;

-- Comentarios explicativos
COMMENT ON COLUMN whatsapp_messages.schedule_type IS 'Tipo de programación: fixed (horarios fijos) o interval (cada x minutos)';
COMMENT ON COLUMN whatsapp_messages.schedule_interval IS 'Intervalo en minutos para envío repetitivo si schedule_type es interval';
COMMENT ON COLUMN whatsapp_messages.fixed_schedules IS 'Lista de horarios específicos para envío si schedule_type es fixed: [{time: string, last_sent_at: string}]';

-- Migración de datos existentes:
-- Si un mensaje individual tiene scheduled_time, poblar fixed_schedules y configurar tipo a 'fixed'
UPDATE whatsapp_messages
SET 
  schedule_type = 'fixed',
  fixed_schedules = jsonb_build_array(
    jsonb_build_object(
      'time', scheduled_time,
      'last_sent_at', last_sent_at
    )
  )
WHERE is_sequence = false AND scheduled_time IS NOT NULL;
