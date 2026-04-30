-- Migración para añadir plantillas adicionales y control de stock
ALTER TABLE catalogs 
ADD COLUMN IF NOT EXISTS out_of_stock_template TEXT DEFAULT '*AGOTADO*\n{product_name}',
ADD COLUMN IF NOT EXISTS new_product_template TEXT DEFAULT '*NUEVO PRODUCTO*\n{product_name}\n{product_description}\nPrecio: {product_price}\n\nCatálogo: {catalog_name}',
ADD COLUMN IF NOT EXISTS available_template TEXT DEFAULT '*ESTÁ DE VUELTA*\n{product_name}\n{product_description}\nPrecio: {product_price}\n\n¡Pide el tuyo ahora!';

-- Añadir control de stock a los productos
ALTER TABLE products
ADD COLUMN IF NOT EXISTS is_out_of_stock BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS stock_status TEXT DEFAULT 'available';

-- Añadir control de envío diario a mensajes individuales
ALTER TABLE whatsapp_messages
ADD COLUMN IF NOT EXISTS last_sent_at TIMESTAMPTZ;

-- Crear tabla de logs de envío si no existe
CREATE TABLE IF NOT EXISTS sending_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    catalog_id UUID REFERENCES catalogs(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    group_name TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('success', 'failed')),
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Crear tabla de cola de mensajes para WhatsApp si no existe
CREATE TABLE IF NOT EXISTS wa_message_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    catalog_id UUID REFERENCES catalogs(id) ON DELETE CASCADE,
    group_id TEXT NOT NULL,
    instance_name TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    payload JSONB NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'error')),
    scheduled_at TIMESTAMPTZ NOT NULL,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS para sending_logs
ALTER TABLE sending_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own logs" ON sending_logs
    FOR SELECT USING (auth.uid() = user_id);

-- RLS para wa_message_queue (solo por seguridad, aunque lo usa el cron con service role)
ALTER TABLE wa_message_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own queue" ON wa_message_queue
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM catalogs 
            WHERE catalogs.id = wa_message_queue.catalog_id 
            AND catalogs.user_id = auth.uid()
        )
    );
