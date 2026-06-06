import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import type { Catalog, CatalogForm } from '../types/catalog';
import { toast } from 'react-hot-toast';
import { optimizeImage, blobToFile } from '../lib/imageOptimizer';

export const useCatalogs = () => {
  const { user } = useAuthStore();
  const [catalogs, setCatalogs] = useState<Catalog[]>([]);
  const [sharedCatalogs, setSharedCatalogs] = useState<Catalog[]>([]);
  const [loading, setLoading] = useState(false);

  const getCatalogs = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('catalogs')
        .select(`
          *,
          products:products(count)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Transform data to include a simple productCount property
      const formattedCatalogs = (data || []).map((cat: any) => ({
        ...cat,
        productCount: cat.products?.[0]?.count || 0
      }));

      setCatalogs(formattedCatalogs);
    } catch (err: any) {
      toast.error('Error al cargar catálogos: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const getSharedCatalogs = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('catalog_members')
        .select(`
          catalog:catalogs (
            *,
            products:products(count)
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'accepted');

      if (error) throw error;

      const formatted = (data || [])
        .map((item: any) => item.catalog)
        .filter(Boolean)
        .map((cat: any) => ({
          ...cat,
          productCount: cat.products?.[0]?.count || 0,
          isCollaboration: true
        }));

      setSharedCatalogs(formatted);
    } catch (err: any) {
      toast.error('Error al cargar colaboraciones: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const createCatalog = async (form: CatalogForm, logoFile?: File, coverFile?: File) => {
    if (!user) return;
    setLoading(true);
    try {
      let logo_url = form.logo_url || null;
      let cover_url = form.cover_url || null;

      if (logoFile) {
        const isPng = logoFile.type === 'image/png';
        const extension = isPng ? 'png' : 'jpg';
        const format = isPng ? 'image/png' : 'image/jpeg';
        const optimizedBlob = await optimizeImage(logoFile, {
          maxWidth: 300,
          maxHeight: 300,
          quality: 0.8,
          format
        });
        const fileName = `catalogs/logo_${Date.now()}.${extension}`;
        const optimizedFile = blobToFile(optimizedBlob, fileName);
        const { error: uploadError } = await supabase.storage
          .from('products')
          .upload(fileName, optimizedFile, {
            contentType: format,
            upsert: true
          });
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from('products').getPublicUrl(fileName);
        logo_url = publicUrl;
      }

      if (coverFile) {
        const isPng = coverFile.type === 'image/png';
        const extension = isPng ? 'png' : 'jpg';
        const format = isPng ? 'image/png' : 'image/jpeg';
        const optimizedBlob = await optimizeImage(coverFile, {
          maxWidth: 1920,
          maxHeight: 768,
          quality: 0.92,
          format
        });
        const fileName = `catalogs/cover_${Date.now()}.${extension}`;
        const optimizedFile = blobToFile(optimizedBlob, fileName);
        const { error: uploadError } = await supabase.storage
          .from('products')
          .upload(fileName, optimizedFile, {
            contentType: format,
            upsert: true
          });
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from('products').getPublicUrl(fileName);
        cover_url = publicUrl;
      }

      const { data, error } = await supabase
        .from('catalogs')
        .insert([{ 
          user_id: user.id, 
          name: form.nombre, 
          slogan: form.slogan || null,
          description: form.descripcion,
          template: form.plantilla || '🛍️ *{product_name}*\n💵 *Precio:* {product_price} {product_currency}\n\n📝 *Detalles:* {product_description}\n\n✨ Ver catálogo completo: *{catalog_name}*',
          share_template: form.share_template || '✨ *¡Mira este producto!* ✨\n\n🛍️ *{product_name}*\n💵 *Precio:* {product_price} {product_currency}\n\n📝 *Detalles:* {product_description}\n\n💬 Escríbenos para ordenarlo o ver más detalles en el catálogo: *{catalog_name}*',
          out_of_stock_template: form.out_of_stock_template || '⚠️ *¡Se agotó!* ⚠️\n\nEl artículo *{product_name}* ha volado y no nos queda stock por el momento.\n\n👉 Mira otros productos similares en nuestro catálogo: *{catalog_name}*',
          new_product_template: form.new_product_template || '🔥 *¡NUEVO INGRESO!* 🔥\n\n🛍️ *{product_name}*\n💵 *Precio:* {product_price} {product_currency}\n\n📝 *Detalles:* {product_description}\n\n🚀 ¡Pide el tuyo ahora escribiéndonos antes de que se agote!',
          available_template: form.available_template || '🎉 *¡DE VUELTA EN STOCK!* 🎉\n\nLo estabas esperando y ya está disponible nuevamente:\n🛍️ *{product_name}*\n💵 *Precio:* {product_price} {product_currency}\n\n📝 *Detalles:* {product_description}\n\n⚡ Las unidades son muy limitadas. ¡Escríbenos para asegurar el tuyo ahora mismo!',
          is_active: form.is_active,
          is_public: form.is_public || false,
          slug: form.slug || null,
          logo_url,
          cover_url,
          primary_color: form.primary_color || '#ff782e',
          background_color: form.background_color || '#0a0a0a',
          surface_color: form.surface_color || '#1a1a1a',
          text_color: form.text_color || '#ffffff',
          is_sequence_scheduled: form.is_sequence_scheduled,
          is_individual_scheduled: form.is_individual_scheduled,
          sequence_start_time: form.sequence_start_time,
          price_update_template: form.price_update_template,
          product_edit_template: form.product_edit_template,
          nemu_store_id: form.nemu_store_id,
          footer_address: form.footer_address || null,
          footer_phone: form.footer_phone || null,
          footer_email: form.footer_email || null,
          footer_schedule: form.footer_schedule || null,
          footer_instagram: form.footer_instagram || null,
          footer_facebook: form.footer_facebook || null,
          usd_to_cup_rate: form.usd_to_cup_rate ?? 1.0,
          cup_to_usd_rate: form.cup_to_usd_rate ?? 1.0,
          display_currency: form.display_currency || 'original',
          min_order_amount: form.min_order_amount ?? 0.0,
          min_order_currency: form.min_order_currency || 'CUP'
        }])
        .select()
        .single();

      if (error) throw error;
      toast.success('Catálogo creado');
      return data;
    } catch (err: any) {
      toast.error('Error al crear: ' + err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const updateCatalog = async (id: string, form: Partial<CatalogForm>, logoFile?: File, coverFile?: File) => {
    setLoading(true);
    try {
      let logo_url = form.logo_url;
      let cover_url = form.cover_url;

      if (logoFile) {
        const isPng = logoFile.type === 'image/png';
        const extension = isPng ? 'png' : 'jpg';
        const format = isPng ? 'image/png' : 'image/jpeg';
        const optimizedBlob = await optimizeImage(logoFile, {
          maxWidth: 300,
          maxHeight: 300,
          quality: 0.8,
          format
        });
        const fileName = `catalogs/logo_${Date.now()}.${extension}`;
        const optimizedFile = blobToFile(optimizedBlob, fileName);
        const { error: uploadError } = await supabase.storage
          .from('products')
          .upload(fileName, optimizedFile, {
            contentType: format,
            upsert: true
          });
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from('products').getPublicUrl(fileName);
        logo_url = publicUrl;
      }

      if (coverFile) {
        const isPng = coverFile.type === 'image/png';
        const extension = isPng ? 'png' : 'jpg';
        const format = isPng ? 'image/png' : 'image/jpeg';
        const optimizedBlob = await optimizeImage(coverFile, {
          maxWidth: 1920,
          maxHeight: 768,
          quality: 0.92,
          format
        });
        const fileName = `catalogs/cover_${Date.now()}.${extension}`;
        const optimizedFile = blobToFile(optimizedBlob, fileName);
        const { error: uploadError } = await supabase.storage
          .from('products')
          .upload(fileName, optimizedFile, {
            contentType: format,
            upsert: true
          });
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from('products').getPublicUrl(fileName);
        cover_url = publicUrl;
      }

      const updateData: any = {};
      
      if (form.nombre !== undefined) updateData.name = form.nombre;
      if (form.slogan !== undefined) updateData.slogan = form.slogan;
      if (form.descripcion !== undefined) updateData.description = form.descripcion;
      if (form.plantilla !== undefined) updateData.template = form.plantilla;
      if (form.share_template !== undefined) updateData.share_template = form.share_template;
      if (form.out_of_stock_template !== undefined) updateData.out_of_stock_template = form.out_of_stock_template;
      if (form.new_product_template !== undefined) updateData.new_product_template = form.new_product_template;
      if (form.available_template !== undefined) updateData.available_template = form.available_template;
      if (form.is_active !== undefined) updateData.is_active = form.is_active;
      if (form.is_public !== undefined) updateData.is_public = form.is_public;
      if (form.slug !== undefined) updateData.slug = form.slug;
      if (logo_url !== undefined) updateData.logo_url = logo_url;
      if (cover_url !== undefined) updateData.cover_url = cover_url;
      if (form.primary_color !== undefined) updateData.primary_color = form.primary_color;
      if (form.background_color !== undefined) updateData.background_color = form.background_color;
      if (form.surface_color !== undefined) updateData.surface_color = form.surface_color;
      if (form.text_color !== undefined) updateData.text_color = form.text_color;
      if (form.is_sequence_scheduled !== undefined) updateData.is_sequence_scheduled = form.is_sequence_scheduled;
      if (form.is_individual_scheduled !== undefined) updateData.is_individual_scheduled = form.is_individual_scheduled;
      if (form.sequence_start_time !== undefined) updateData.sequence_start_time = form.sequence_start_time;
      if (form.price_update_template !== undefined) updateData.price_update_template = form.price_update_template;
      if (form.product_edit_template !== undefined) updateData.product_edit_template = form.product_edit_template;
      if (form.nemu_store_id !== undefined) updateData.nemu_store_id = form.nemu_store_id;
      if (form.sequence_schedules !== undefined) updateData.sequence_schedules = form.sequence_schedules;
      if (form.footer_address !== undefined) updateData.footer_address = form.footer_address;
      if (form.footer_phone !== undefined) updateData.footer_phone = form.footer_phone;
      if (form.footer_email !== undefined) updateData.footer_email = form.footer_email;
      if (form.footer_schedule !== undefined) updateData.footer_schedule = form.footer_schedule;
      if (form.footer_instagram !== undefined) updateData.footer_instagram = form.footer_instagram;
      if (form.footer_facebook !== undefined) updateData.footer_facebook = form.footer_facebook;
      if (form.usd_to_cup_rate !== undefined) updateData.usd_to_cup_rate = form.usd_to_cup_rate;
      if (form.cup_to_usd_rate !== undefined) updateData.cup_to_usd_rate = form.cup_to_usd_rate;
      if (form.display_currency !== undefined) updateData.display_currency = form.display_currency;
      if (form.min_order_amount !== undefined) updateData.min_order_amount = form.min_order_amount;
      if (form.min_order_currency !== undefined) updateData.min_order_currency = form.min_order_currency;

      const { error } = await supabase
        .from('catalogs')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
      toast.success('Catálogo actualizado');
      return true;
    } catch (err: any) {
      toast.error('Error al actualizar: ' + err.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const deleteCatalog = async (id: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('catalogs')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setCatalogs(catalogs.filter(c => c.id !== id));
      toast.success('Catálogo eliminado');
      return true;
    } catch (err: any) {
      toast.error('Error al eliminar: ' + err.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { catalogs, sharedCatalogs, loading, getCatalogs, getSharedCatalogs, createCatalog, updateCatalog, deleteCatalog };
};
