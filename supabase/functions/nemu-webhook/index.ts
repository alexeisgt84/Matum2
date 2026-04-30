import { createClient } from "jsr:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

// Credenciales de Nemu para consultar datos frescos
const nemuUrl = 'https://vkvgdaodurgdgltgwyse.supabase.co';
const nemuAnonKey = Deno.env.get('NEMU_SUPABASE_ANON_KEY') || '';

// Secreto para validar que la petición viene de Nemu
const NEMU_SECRET = "nemu_sync_auth_8f9e6a2b4c1d0e5f";

const supabase = createClient(supabaseUrl, supabaseKey);
const nemuSupabase = createClient(nemuUrl, nemuAnonKey);

Deno.serve(async (req) => {
  try {
    const authHeader = req.headers.get("x-nemu-secret");
    if (authHeader !== NEMU_SECRET) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const payload = await req.json();
    const { type, table, record, old_record } = payload;

    console.log(`Recibido evento ${type} en tabla ${table} para ID ${record?.id || old_record?.id}`);

    if (table !== 'products') {
      return new Response(JSON.stringify({ message: "Table not handled" }), { status: 200 });
    }

    const nemuId = record?.id || old_record?.id;

    if (type === 'DELETE') {
      // Eliminar el producto en Matum2
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('nemu_product_id', nemuId);
      
      if (error) throw error;
      console.log(`Producto ${nemuId} eliminado en Matum2`);
      return new Response(JSON.stringify({ success: true, action: "deleted" }));
    }

    if (type === 'INSERT' || type === 'UPDATE') {
      // 1. Obtener datos frescos de Nemu (incluyendo imágenes)
      const { data: nemuProd, error: nemuError } = await nemuSupabase
        .from('products')
        .select('*, product_images(url, display_order)')
        .eq('id', nemuId)
        .single();
      
      if (nemuError || !nemuProd) {
        console.error("Error obteniendo producto de Nemu:", nemuError);
        return new Response(JSON.stringify({ error: "Product not found in Nemu" }), { status: 404 });
      }

      // 2. Buscar si tenemos este producto en Matum2
      const { data: localProducts, error: localError } = await supabase
        .from('products')
        .select('id, catalog_id, imagen_url')
        .eq('nemu_product_id', nemuId);
      
      if (localError) throw localError;

      if (!localProducts || localProducts.length === 0) {
        return new Response(JSON.stringify({ message: "Product not linked in Matum2" }), { status: 200 });
      }

      // 3. Procesar imagen si es necesario
      const images = nemuProd.product_images || [];
      const firstImageUrl = images.sort((a: any, b: any) => (a.display_order || 0) - (b.display_order || 0))[0]?.url;

      for (const localProduct of localProducts) {
        let finalImageUrl = localProduct.imagen_url;

        // Si la imagen en Nemu cambió, la migramos
        // Nota: Esta comparación es simple (URL), podríamos mejorarla
        if (firstImageUrl && firstImageUrl !== nemuProd.old_image_url_placeholder) { 
           try {
             const response = await fetch(firstImageUrl);
             const blob = await response.blob();
             const fileName = `${localProduct.catalog_id}/synced_${Date.now()}.jpg`;
             
             const { error: uploadError } = await supabase.storage
               .from('products')
               .upload(fileName, blob, { contentType: 'image/jpeg', upsert: true });

             if (!uploadError) {
               const { data: { publicUrl } } = supabase.storage.from('products').getPublicUrl(fileName);
               finalImageUrl = publicUrl;
             }
           } catch (imgErr) {
             console.error("Error migrando imagen en sync:", imgErr);
           }
        }

        // 4. Actualizar Matum2
        const { error: updateError } = await supabase
          .from('products')
          .update({
            name: nemuProd.name,
            description: nemuProd.description,
            price: nemuProd.price,
            currency: nemuProd.currency || 'CUP',
            imagen_url: finalImageUrl,
            is_out_of_stock: nemuProd.stock_status === 'out_of_stock' || nemuProd.is_active === false
          })
          .eq('id', localProduct.id);
        
        if (updateError) console.error(`Error actualizando producto local ${localProduct.id}:`, updateError);
      }

      return new Response(JSON.stringify({ success: true, action: "updated", count: localProducts.length }));
    }

    return new Response(JSON.stringify({ message: "Event not handled" }), { status: 200 });

  } catch (error: any) {
    console.error('Error procesando webhook:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
