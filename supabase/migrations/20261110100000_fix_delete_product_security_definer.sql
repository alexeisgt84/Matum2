-- Asegurar que la función del trigger para productos eliminados corra con SECURITY DEFINER
-- de modo que no sea bloqueada por Row Level Security (RLS) al actualizar productos vinculados.

CREATE OR REPLACE FUNCTION public.handle_deleted_parent_product() 
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.products
    SET 
        is_discontinued = true,
        is_active = false,
        updated_at = now()
    WHERE parent_product_id = OLD.id;

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;
