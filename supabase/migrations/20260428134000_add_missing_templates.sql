-- Migración para añadir columnas de plantillas faltantes en catalogs
ALTER TABLE catalogs 
ADD COLUMN IF NOT EXISTS share_template TEXT DEFAULT '*{product_name}*\n\n{product_description}\n\nPrecio: {product_price}',
ADD COLUMN IF NOT EXISTS price_update_template TEXT DEFAULT '*ACTUALIZACIÓN DE PRECIO*\n{product_name}\n\nNuevo precio: {product_price}',
ADD COLUMN IF NOT EXISTS product_edit_template TEXT DEFAULT '*PRODUCTO ACTUALIZADO*\n{product_name}\n{product_description}\nPrecio: {product_price}';

-- Comentarios descriptivos
COMMENT ON COLUMN catalogs.share_template IS 'Plantilla para compartir productos individualmente';
COMMENT ON COLUMN catalogs.price_update_template IS 'Plantilla para notificar cambios de precio';
COMMENT ON COLUMN catalogs.product_edit_template IS 'Plantilla para notificar ediciones de productos';
