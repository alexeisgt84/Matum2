import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useCatalogs } from '../../hooks/useCatalogs';
import { Button } from '../../components/ui/Button';
import { Save, Info, Layout } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { PageHeader } from '../../components/ui/PageHeader';
import { RichTextarea } from '../../components/ui/RichTextarea';
import type { RichTextareaHandle } from '../../types/ui';
import { toast } from 'react-hot-toast';

interface TemplateSectionProps {
  id: string;
  label: string;
  classes: { text: string; border: string; hoverText: string; hoverBorder: string; hoverBg: string };
  value: string;
  onChange: (val: string) => void;
  info: string;
  helperText: string;
  tagPrefix: string;
  sectionRef: React.RefObject<RichTextareaHandle | null>;
}

const TemplateSection = ({ 
  id, 
  label, 
  classes, 
  value, 
  onChange, 
  info, 
  helperText,
  tagPrefix,
  sectionRef
}: TemplateSectionProps) => (
  <div id={`template-${id}`} className={`card !p-4 sm:!p-6 space-y-4 w-full sm:min-w-[400px] snap-center shrink-0 border-border/40 ${classes.border}`}>
    <div className="flex items-center justify-between border-b border-border pb-3">
      <label className={`text-sm font-bold uppercase tracking-widest ${classes.text}`}>{label}</label>
      <div className="group relative">
        <Info size={16} className="text-secondary cursor-help" />
        <div className="absolute bottom-full right-0 mb-2 w-64 p-3 bg-surface border border-border rounded-xl text-[11px] text-secondary hidden group-hover:block z-50 shadow-2xl">
          {info}
        </div>
      </div>
    </div>
    
    <RichTextarea
      ref={sectionRef}
      placeholder="Escribe el mensaje..."
      value={value}
      onChange={onChange}
      helperText={helperText}
    />

    <div className="flex flex-wrap gap-2 mt-2">
      {[
        '{product_name}',
        '{product_description}',
        '{product_price}',
        '{product_currency}',
        '{catalog_name}'
      ].map(tag => (
        <button
          key={tag + tagPrefix}
          type="button"
          onClick={() => sectionRef.current?.insertAtCursor(tag)}
          className={`px-2 py-1 bg-surface-hover ${classes.hoverBg} border border-border ${classes.hoverBorder} rounded text-[10px] font-mono text-secondary ${classes.hoverText} transition-all`}
        >
          {tag}
        </button>
      ))}
    </div>
  </div>
);

export const CatalogTemplatesPage = () => {
  const { catalogId } = useParams();
  const navigate = useNavigate();
  const { loading, updateCatalog } = useCatalogs();
  
  const [form, setForm] = useState({
    plantilla: '',
    share_template: '',
    out_of_stock_template: '',
    new_product_template: '',
    available_template: '',
  });

  const plantillaRef = useRef<RichTextareaHandle>(null);
  const shareRef = useRef<RichTextareaHandle>(null);
  const newRef = useRef<RichTextareaHandle>(null);
  const outOfStockRef = useRef<RichTextareaHandle>(null);
  const availableRef = useRef<RichTextareaHandle>(null);

  const [catalogName, setCatalogName] = useState('');

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
      setCatalogName(data.name);
      setForm({
        plantilla: data.template || '',
        share_template: data.share_template || '*{product_name}*\n\n{product_description}\n\nPrecio: {product_price}',
        out_of_stock_template: data.out_of_stock_template || '*AGOTADO*\n{product_name}',
        new_product_template: data.new_product_template || '*NUEVO PRODUCTO*\n{product_name}\n{product_description}\nPrecio: {product_price}\n\nCatálogo: {catalog_name}',
        available_template: data.available_template || '*ESTÁ DE VUELTA*\n{product_name}\n{product_description}\nPrecio: {product_price}\n\n¡Pide el tuyo ahora!',
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catalogId) return;

    const success = await updateCatalog(catalogId, form);
    if (success) {
      toast.success('Plantillas actualizadas correctamente');
      navigate(`/catalogs/${catalogId}`);
    }
  };

  return (
    <div className="p-4 max-w-lg mx-auto pb-24">
      <PageHeader 
        title="Plantillas de Mensaje" 
        subtitle={catalogName || 'Cargando...'}
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex flex-col gap-3 px-1">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-primary uppercase tracking-wider">Configuración Visual</h3>
            <span className="text-[10px] text-secondary uppercase tracking-widest bg-surface-hover px-2 py-1 rounded-full">Desliza para ver más</span>
          </div>
          
          <div className="flex gap-2 p-1 overflow-x-auto [&::-webkit-scrollbar]:hidden">
            {[
              { id: 'normal', label: 'Normal', border: 'border-[var(--accent)]/50', text: 'text-[var(--accent)]' },
              { id: 'compartir', label: 'Compartir', border: 'border-pink-500/50', text: 'text-pink-400' },
              { id: 'nuevo', label: 'Nuevo', border: 'border-blue-500/50', text: 'text-blue-400' },
              { id: 'agotado', label: 'Agotados', border: 'border-orange-500/50', text: 'text-orange-400' },
              { id: 'disponible', label: 'Disponible', border: 'border-purple-500/50', text: 'text-purple-400' }
            ].map(menuItem => (
              <button
                key={menuItem.id}
                type="button"
                onClick={() => {
                  const el = document.getElementById(`template-${menuItem.id}`);
                  el?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                }}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest border bg-surface-hover whitespace-nowrap transition-all active:scale-95 ${menuItem.border} ${menuItem.text}`}
              >
                {menuItem.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-4 px-1 [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none' }}>
          
          <TemplateSection 
            id="normal"
            label="Normal"
            classes={{ 
              text: 'text-[var(--accent)]', 
              border: 'border-[var(--accent)]/20',
              hoverText: 'hover:text-[var(--accent)]',
              hoverBorder: 'hover:border-[var(--accent)]/30',
              hoverBg: 'hover:bg-[var(--accent)]/10'
            }}
            value={form.plantilla}
            onChange={(val) => setForm({ ...form, plantilla: val })}
            info="Esta plantilla se usará para cada producto en el catálogo principal."
            helperText="Se envía cuando muestras los productos del catálogo."
            tagPrefix="_p"
            sectionRef={plantillaRef}
          />

          <TemplateSection 
            id="compartir"
            label="Compartir"
            classes={{ 
              text: 'text-pink-500', 
              border: 'border-pink-500/20',
              hoverText: 'hover:text-pink-500',
              hoverBorder: 'hover:border-pink-500/30',
              hoverBg: 'hover:bg-pink-500/10'
            }}
            value={form.share_template}
            onChange={(val) => setForm({ ...form, share_template: val })}
            info="Esta plantilla se usará al compartir un producto individual."
            helperText="Plantilla personalizada para compartir productos individualmente."
            tagPrefix="_s"
            sectionRef={shareRef}
          />

          <TemplateSection 
            id="nuevo"
            label="Nuevo"
            classes={{ 
              text: 'text-blue-500', 
              border: 'border-blue-500/20',
              hoverText: 'hover:text-blue-500',
              hoverBorder: 'hover:border-blue-500/30',
              hoverBg: 'hover:bg-blue-500/10'
            }}
            value={form.new_product_template}
            onChange={(val) => setForm({ ...form, new_product_template: val })}
            info="Se envía para notificar el ingreso de un nuevo producto."
            helperText="Notificación de nuevo ingreso."
            tagPrefix="_n"
            sectionRef={newRef}
          />

          <TemplateSection 
            id="agotado"
            label="Agotados"
            classes={{ 
              text: 'text-orange-500', 
              border: 'border-orange-500/20',
              hoverText: 'hover:text-orange-500',
              hoverBorder: 'hover:border-orange-500/30',
              hoverBg: 'hover:bg-orange-500/10'
            }}
            value={form.out_of_stock_template}
            onChange={(val) => setForm({ ...form, out_of_stock_template: val })}
            info="Se envía para notificar que un producto está agotado."
            helperText="Aviso de stock agotado."
            tagPrefix="_o"
            sectionRef={outOfStockRef}
          />

          <TemplateSection 
            id="disponible"
            label="Disponible"
            classes={{ 
              text: 'text-purple-500', 
              border: 'border-purple-500/20',
              hoverText: 'hover:text-purple-400',
              hoverBorder: 'hover:border-purple-500/30',
              hoverBg: 'hover:bg-purple-500/10'
            }}
            value={form.available_template}
            onChange={(val) => setForm({ ...form, available_template: val })}
            info="Se envía para notificar que el producto vuelve a estar disponible."
            helperText="Aviso de stock disponible."
            tagPrefix="_av"
            sectionRef={availableRef}
          />

        </div>

        <div className="pt-4">
          <Button 
            type="submit" 
            className="w-full" 
            loading={loading}
            icon={Save}
            size="lg"
          >
            Guardar Plantillas
          </Button>
        </div>
      </form>
    </div>
  );
};
