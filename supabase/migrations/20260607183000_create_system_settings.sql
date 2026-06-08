-- Create system_settings table
CREATE TABLE IF NOT EXISTS public.system_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Policies
-- Anyone (including anonymous users) can read system settings
CREATE POLICY "Anyone can read system settings" 
    ON public.system_settings FOR SELECT 
    USING (true);

-- Only admins can modify system settings
CREATE POLICY "Only admins can modify system settings" 
    ON public.system_settings FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Insert default app_url setting
INSERT INTO public.system_settings (key, value, description)
VALUES ('app_url', 'matum.vercel.app', 'Dominio o URL principal de la aplicación')
ON CONFLICT (key) DO UPDATE SET
    value = EXCLUDED.value,
    description = EXCLUDED.description;
