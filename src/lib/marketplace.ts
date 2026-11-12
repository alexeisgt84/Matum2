import { supabase } from './supabase';

/**
 * Alterna el estado de stock (agotado / disponible) de un producto
 * en un catálogo marketplace colaborativo, verificando pertenencia por número de teléfono.
 */
export async function toggleMarketplaceStock(productId: string, isOutOfStock: boolean): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('toggle_marketplace_product_stock', {
      p_product_id: productId,
      p_is_out_of_stock: isOutOfStock,
    });
    if (error) {
      console.error('[Marketplace] Error al alternar stock:', error);
      return false;
    }
    return Boolean(data);
  } catch (err) {
    console.error('[Marketplace] Excepción al alternar stock:', err);
    return false;
  }
}

/**
 * Permite al vendedor de WhatsApp editar los detalles de su propio producto
 * directamente desde la app web o móvil.
 */
export async function updateMarketplaceProduct(params: {
  productId: string;
  name?: string;
  description?: string | null;
  price?: number | null;
  currency?: string;
  deliveryCost?: number | null;
  deliveryCurrency?: string | null;
}): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('update_marketplace_product', {
      p_product_id: params.productId,
      p_name: params.name?.trim() || null,
      p_description: params.description !== undefined ? params.description : null,
      p_price: params.price !== undefined && params.price !== null ? Number(params.price) : null,
      p_currency: params.currency || null,
      p_delivery_cost: params.deliveryCost !== undefined && params.deliveryCost !== null ? Number(params.deliveryCost) : null,
      p_delivery_currency: params.deliveryCurrency || null,
    });
    if (error) {
      console.error('[Marketplace] Error al editar producto:', error);
      return false;
    }
    return Boolean(data);
  } catch (err) {
    console.error('[Marketplace] Excepción al editar producto:', err);
    return false;
  }
}
