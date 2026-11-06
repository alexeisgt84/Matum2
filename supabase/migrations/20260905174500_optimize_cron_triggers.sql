-- MigraciÃ³n para optimizar crons de mensajerÃ­a y evitar saturaciÃ³n del servidor
-- 1. FunciÃ³n para disparar cron-sequence-generator de forma segura
CREATE OR REPLACE FUNCTION public.trigger_cron_sequence_generator()
RETURNS void AS $$
BEGIN
  -- Evitar ejecuciones simultÃ¡neas con advisory lock
  IF pg_try_advisory_xact_lock(746391) THEN
    -- Solo invocar si existen catÃ¡logos activos con alguna programaciÃ³n habilitada
    IF EXISTS (
      SELECT 1 FROM public.catalogs 
      WHERE is_active = true AND (is_sequence_scheduled = true OR is_individual_scheduled = true)
    ) THEN
      PERFORM net.http_post(
        url := 'https://auehpfkkcvgdjsbyioya.supabase.co/functions/v1/cron-sequence-generator',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1ZWhwZmtrY3ZnZGpzYnlpb3lhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTA0MzY3MCwiZXhwIjoyMDkwNjE5NjcwfQ.e08rct-TAEc9ukMA2wLS6Fs4zYgMFIEb8OcGmIcBNYc"}'::jsonb,
        body := '{}'::jsonb
      );
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. FunciÃ³n para disparar cron-message-sender de forma segura
CREATE OR REPLACE FUNCTION public.trigger_cron_message_sender()
RETURNS void AS $$
BEGIN
  -- Evitar solapamiento si un envÃ­o previo sigue en curso
  IF pg_try_advisory_xact_lock(746392) THEN
    -- Solo invocar si realmente hay mensajes pendientes por enviar
    IF EXISTS (
      SELECT 1 FROM public.wa_message_queue 
      WHERE status = 'pending' AND scheduled_at <= now()
    ) THEN
      PERFORM net.http_post(
        url := 'https://auehpfkkcvgdjsbyioya.supabase.co/functions/v1/cron-message-sender',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1ZWhwZmtrY3ZnZGpzYnlpb3lhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTA0MzY3MCwiZXhwIjoyMDkwNjE5NjcwfQ.e08rct-TAEc9ukMA2wLS6Fs4zYgMFIEb8OcGmIcBNYc"}'::jsonb,
        body := '{}'::jsonb
      );
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Desprogramar tareas previas
SELECT cron.unschedule(jobname)
FROM cron.job
WHERE jobname IN ('cron-sequence-generator-job', 'cron-message-sender-job');

-- 4. Reprogramar tareas optimizadas
SELECT cron.schedule(
    'cron-sequence-generator-job',
    '*/2 * * * *',
    'SELECT public.trigger_cron_sequence_generator();'
);

SELECT cron.schedule(
    'cron-message-sender-job',
    '* * * * *',
    'SELECT public.trigger_cron_message_sender();'
);