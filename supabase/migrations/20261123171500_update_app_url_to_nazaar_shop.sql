-- Actualiza el dominio público por defecto en system_settings desde matum.vercel.app hacia nazaar.shop
INSERT INTO public.system_settings (key, value, description, updated_at)
VALUES (
  'app_url',
  'nazaar.shop',
  'Dominio o URL principal de la aplicación pública para los enlaces',
  NOW()
)
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  updated_at = NOW()
WHERE public.system_settings.value IN ('matum.vercel.app', 'nazzar.shop', '');
