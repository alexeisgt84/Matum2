-- Añadir la columna gemini_model a la tabla users si no existe
ALTER TABLE users ADD COLUMN IF NOT EXISTS gemini_model TEXT DEFAULT 'gemini-1.5-flash';

-- Añadir comentario explicativo para la columna
COMMENT ON COLUMN users.gemini_model IS 'Modelo de Google Gemini seleccionado por el usuario para análisis de IA';
