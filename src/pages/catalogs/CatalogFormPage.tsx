import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useCatalogs } from '../../hooks/useCatalogs';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Save, Info, Zap } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { PageHeader } from '../../components/ui/PageHeader';
import { Switch } from '../../components/ui/Switch';

export const CatalogFormPage = () => {
  const { catalogId } = useParams();
  const navigate = useNavigate();
  const { createCatalog, updateCatalog, loading } = useCatalogs();
  
  const [form, setForm] = useState({
    nombre: '',
    descripcion: '',
    plantilla: '¡Hola! Te comparto nuestro catálogo de *{catalog_name}*.\n\n*Productos destacados:*\n{products_list}\n\nPara más info, escríbenos.',
    is_active: true,
    is_sequence_scheduled: false,
    is_individual_scheduled: false,
    sequence_start_time: '09:00'
  });

  useEffect(() => {
    if (catalogId) {
      loadCatalog();
    }
  }, [catalogId]);

  const loadCatalog = async () => {
    const { data, error } = await supabase
      .from('catalogs')
      .select('*')
      .eq('id', catalogId)
      .single();
    
    if (data) {
      setForm({
        nombre: data.name,
        descripcion: data.description || '',
        plantilla: data.template || form.plantilla,
        is_active: data.is_active ?? true,
        is_sequence_scheduled: data.is_sequence_scheduled ?? false,
        is_individual_scheduled: data.is_individual_scheduled ?? false,
        sequence_start_time: data.sequence_start_time || '09:00'
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: form.nombre,
      description: form.descripcion,
      template: form.plantilla,
      is_active: form.is_active,
      is_sequence_scheduled: form.is_sequence_scheduled,
      is_individual_scheduled: form.is_individual_scheduled,
      sequence_start_time: form.sequence_start_time
    };

    if (catalogId) {
      const { error } = await supabase.from('catalogs').update(payload).eq('id', catalogId);
      if (!error) navigate('/catalogs');
    } else {
      const { error } = await supabase.from('catalogs').insert([payload]);
      if (!error) navigate('/catalogs');
    }
  };

  return (
    <div className="p-4 max-w-lg mx-auto pb-24">
      <PageHeader 
        title={catalogId ? 'Editar Catálogo' : 'Nuevo Catálogo'} 
        subtitle="Configuración General"
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card space-y-4">
          <Input
            label="Nombre del Catálogo"
            placeholder="Ej: Ofertas del Mes"
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            required
            autoFocus
          />
          
          <Input
            label="Descripción (Opcional)"
            placeholder="Ej: Selección de productos con descuento"
            multiline
            rows={3}
            value={form.descripcion}
            onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
          />
        </div>

        <div className="card space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Automatización</h3>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">Configuración de envíos automáticos</p>
            </div>
          </div>

          <div className="space-y-4 border-t border-white/5 pt-4">
            <Switch
              label="Envío de Secuencia Diaria"
              subtitle="Dispara todos los mensajes de secuencia a la hora fijada"
              checked={form.is_sequence_scheduled}
              onChange={(checked) => setForm({ ...form, is_sequence_scheduled: checked })}
            />

            <Switch
              label="Mensajes Individuales"
              subtitle="Permite el envío programado de mensajes sueltos"
              checked={form.is_individual_scheduled}
              onChange={(checked) => setForm({ ...form, is_individual_scheduled: checked })}
            />

            {(form.is_sequence_scheduled || form.is_individual_scheduled) && (
              <div className="pt-2 animate-in fade-in slide-in-from-top-2 duration-300">
                <Input
                  label="Hora de Inicio Diaria"
                  type="time"
                  value={form.sequence_start_time}
                  onChange={(e) => setForm({ ...form, sequence_start_time: e.target.value })}
                  icon={Zap}
                />
              </div>
            )}
          </div>
        </div>

        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-sm font-bold text-gray-400 uppercase tracking-widest">Plantilla de Mensaje</label>
            <div className="group relative">
              <Info size={16} className="text-gray-500 cursor-help" />
              <div className="absolute bottom-full right-0 mb-2 w-64 p-3 bg-black border border-white/10 rounded-xl text-[11px] text-gray-400 hidden group-hover:block z-50 shadow-2xl">
                Esta plantilla se usará para cada producto. Usa <code className="text-[#25D366]">{'{product_name}'}</code>, <code className="text-[#25D366]">{'{product_description}'}</code> y <code className="text-[#25D366]">{'{product_price}'}</code> para personalizar el mensaje.
              </div>
            </div>
          </div>
          
          <Input
            multiline
            rows={6}
            placeholder="Escribe el mensaje que acompañará al catálogo..."
            value={form.plantilla}
            onChange={(e) => setForm({ ...form, plantilla: e.target.value })}
            helperText="Este mensaje se usará al compartir el catálogo por WhatsApp."
          />

          <div className="flex flex-wrap gap-2 mt-2">
            {[
              '{product_name}',
              '{product_description}',
              '{product_price}',
              '{product_currency}'
            ].map(tag => (
              <button
                key={tag}
                type="button"
                onClick={() => setForm({ ...form, plantilla: form.plantilla + ' ' + tag })}
                className="px-2 py-1 bg-white/5 hover:bg-[#25D366]/10 border border-white/10 hover:border-[#25D366]/30 rounded text-[10px] font-mono text-gray-400 hover:text-[#25D366] transition-all"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        <div className="pt-4">
          <Button 
            type="submit" 
            className="w-full" 
            loading={loading}
            icon={Save}
            size="lg"
          >
            {catalogId ? 'Guardar Cambios' : 'Crear Catálogo'}
          </Button>
        </div>
      </form>
    </div>
  );
};
