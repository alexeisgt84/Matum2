import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useCatalogs } from '../../hooks/useCatalogs';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Save, Info, Zap } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { PageHeader } from '../../components/ui/PageHeader';
import { Switch } from '../../components/ui/Switch';
import { toast } from 'react-hot-toast';

export const CatalogFormPage = () => {
  const { catalogId } = useParams();
  const navigate = useNavigate();
  const { loading, createCatalog, updateCatalog } = useCatalogs();
  
  const [form, setForm] = useState({
    nombre: '',
    descripcion: '',
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
    const { data } = await supabase
      .from('catalogs')
      .select('*')
      .eq('id', catalogId)
      .single();
    
    if (data) {
      setForm({
        nombre: data.name,
        descripcion: data.description || '',
        is_active: data.is_active ?? true,
        is_sequence_scheduled: data.is_sequence_scheduled ?? false,
        is_individual_scheduled: data.is_individual_scheduled ?? false,
        sequence_start_time: data.sequence_start_time || '09:00'
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (catalogId) {
      const success = await updateCatalog(catalogId, form);
      if (success) navigate(`/catalogs/${catalogId}`);
    } else {
      const data = await createCatalog(form);
      if (data) navigate('/catalogs');
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
              <h3 className="text-sm font-bold text-primary uppercase tracking-wider">Automatización</h3>
              <p className="text-[10px] text-secondary uppercase tracking-widest mt-1">Configuración de envíos automáticos</p>
            </div>
          </div>

          <div className="space-y-4 border-t border-border pt-4">
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
