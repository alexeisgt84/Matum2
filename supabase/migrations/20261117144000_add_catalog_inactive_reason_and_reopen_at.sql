-- Agregar motivo de inactividad y fecha programada de reapertura a catalogs
ALTER TABLE public.catalogs
  ADD COLUMN IF NOT EXISTS inactive_reason TEXT,
  ADD COLUMN IF NOT EXISTS reopen_at TIMESTAMPTZ;

-- Permitir lectura pública de catálogos públicos incluso cuando están inactivos,
-- para poder mostrar el motivo de inactividad y la cuenta regresiva de reapertura.
DROP POLICY IF EXISTS "Permitir lectura pública de catálogos activos y públicos" ON public.catalogs;
CREATE POLICY "Permitir lectura pública de catálogos públicos"
  ON public.catalogs
  FOR SELECT
  USING (is_public = true);
