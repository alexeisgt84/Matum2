CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

SELECT cron.schedule(
    'cron-sequence-generator-job',
    '* * * * *',
    $$
    SELECT net.http_post(
        url:='https://auehpfkkcvgdjsbyioya.supabase.co/functions/v1/cron-sequence-generator',
        headers:='{"Content-Type": "application/json"}'::jsonb
    ) as request_id;
    $$
);

SELECT cron.schedule(
    'cron-message-sender-job',
    '* * * * *',
    $$
    SELECT net.http_post(
        url:='https://auehpfkkcvgdjsbyioya.supabase.co/functions/v1/cron-message-sender',
        headers:='{"Content-Type": "application/json"}'::jsonb
    ) as request_id;
    $$
);
