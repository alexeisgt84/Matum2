-- Migración para añadir índices de rendimiento y optimizar recursos

-- 1. Optimización para la cola de mensajes (wa_message_queue)
-- Índice parcial sobre 'scheduled_at' para las filas con estado 'pending'.
-- Esto acelera drásticamente la consulta del cron 'cron-message-sender-job' que ejecuta cada minuto.
CREATE INDEX IF NOT EXISTS idx_wa_queue_pending_scheduled 
ON public.wa_message_queue (scheduled_at) 
WHERE status = 'pending';

-- Índice en la llave foránea 'catalog_id' para acelerar joins y cascadas.
CREATE INDEX IF NOT EXISTS idx_wa_queue_catalog_id 
ON public.wa_message_queue (catalog_id);


-- 2. Optimización para los logs de envío (sending_logs)
-- Índice en la columna 'user_id' que optimiza la política RLS 'Users can view their own logs' y búsquedas de usuario.
CREATE INDEX IF NOT EXISTS idx_sending_logs_user_id 
ON public.sending_logs (user_id);

-- Índice en 'catalog_id' para joins rápidos.
CREATE INDEX IF NOT EXISTS idx_sending_logs_catalog_id 
ON public.sending_logs (catalog_id);


-- 3. Optimización para transacciones de pago (payment_transactions)
-- Índice en 'user_id' para optimizar la política RLS 'Users can view their own transactions'.
CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_id 
ON public.payment_transactions (user_id);

-- Índice en 'validated_by' para búsquedas administrativas.
CREATE INDEX IF NOT EXISTS idx_payment_transactions_validated_by 
ON public.payment_transactions (validated_by);


-- 4. Optimización para miembros de catálogos (catalog_members)
-- Índice en 'user_id' para optimizar el acceso de colaboradores vía RLS.
CREATE INDEX IF NOT EXISTS idx_catalog_members_user_id 
ON public.catalog_members (user_id);

-- Índice compuesto para verificar colaboración de forma eficiente en las subconsultas EXISTS de RLS.
CREATE INDEX IF NOT EXISTS idx_catalog_members_collab 
ON public.catalog_members (catalog_id, user_id, status);


-- 5. Optimización para seguimiento de catálogos (followed_catalogs)
-- Índice en 'catalog_id' para realizar consultas inversas rápidas de seguidores de un catálogo.
CREATE INDEX IF NOT EXISTS idx_followed_catalogs_catalog_id 
ON public.followed_catalogs (catalog_id);


-- 6. Optimización para grupos de WhatsApp (whatsapp_groups)
-- Índice en 'catalog_id' para optimizar la carga de grupos activos del catálogo por parte del generador de secuencias.
CREATE INDEX IF NOT EXISTS idx_whatsapp_groups_catalog_id 
ON public.whatsapp_groups (catalog_id);


-- 7. Optimización para mensajes de WhatsApp (whatsapp_messages)
-- Índice compuesto para la obtención rápida de mensajes del catálogo por tipo (secuencia o individual).
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_catalog_type 
ON public.whatsapp_messages (catalog_id, is_sequence, is_individual);


-- 8. Optimización para productos (products)
-- Índice compuesto para obtener productos activos de un catálogo.
CREATE INDEX IF NOT EXISTS idx_products_catalog_active 
ON public.products (catalog_id, is_active);

-- Índice en 'parent_product_id' para acelerar la propagación de actualizaciones de productos importados en el trigger 'sync_imported_product'.
CREATE INDEX IF NOT EXISTS idx_products_parent_product_id 
ON public.products (parent_product_id);

-- Índice en la llave foránea 'category_id' para búsquedas por categoría y cascadas seguras.
CREATE INDEX IF NOT EXISTS idx_products_category_id 
ON public.products (category_id);


-- 9. Optimización para categorías (categories)
-- Índice en la llave foránea 'catalog_id'.
CREATE INDEX IF NOT EXISTS idx_categories_catalog_id 
ON public.categories (catalog_id);
