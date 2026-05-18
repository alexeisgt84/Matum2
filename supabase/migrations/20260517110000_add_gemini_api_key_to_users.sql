-- Añadir la columna gemini_api_key a la tabla users si no existe
ALTER TABLE users ADD COLUMN IF NOT EXISTS gemini_api_key TEXT;

-- Añadir comentario explicativo para la columna
COMMENT ON COLUMN users.gemini_api_key IS 'Clave API personal de Google Gemini del usuario para análisis de IA';
