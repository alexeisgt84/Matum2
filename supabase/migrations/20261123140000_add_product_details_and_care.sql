-- Migración para añadir campos de detalles, dimensiones y cuidados del producto
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS details_and_dimensions text,
ADD COLUMN IF NOT EXISTS care_and_maintenance text;

COMMENT ON COLUMN products.details_and_dimensions IS 'Especificaciones técnicas, medidas, peso y dimensiones del producto';
COMMENT ON COLUMN products.care_and_maintenance IS 'Instrucciones y recomendaciones de cuidado, limpieza y mantenimiento';
