-- Eliminar el cron si ya existe para evitar duplicados en redeploys
SELECT cron.unschedule(jobname)
FROM cron.job
WHERE jobname = 'clean-old-whatsapp-data-job';

-- Función de limpieza
CREATE OR REPLACE FUNCTION public.clean_old_whatsapp_data(days_to_keep INTEGER DEFAULT 7)
RETURNS void AS $$
BEGIN
    -- 1. Eliminar de la cola de mensajes aquellos en estado finalizado antiguos
    DELETE FROM public.wa_message_queue
    WHERE status IN ('sent', 'error', 'cancelled')
      AND updated_at < now() - (days_to_keep || ' days')::INTERVAL;

    -- 2. Eliminar logs del historial antiguos
    DELETE FROM public.sending_logs
    WHERE created_at < now() - (days_to_keep || ' days')::INTERVAL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Programar la limpieza diaria a las 03:00 AM (UTC)
SELECT cron.schedule(
    'clean-old-whatsapp-data-job',
    '0 3 * * *',
    $$
    SELECT public.clean_old_whatsapp_data(7);
    $$
);
