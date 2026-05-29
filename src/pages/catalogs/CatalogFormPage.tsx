import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useCatalogs } from '../../hooks/useCatalogs';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Save, Info, Zap, Globe, AlertCircle, Camera } from 'lucide-react';
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
    is_public: false,
    slug: '',
    is_sequence_scheduled: false,
    is_individual_scheduled: false,
    sequence_start_time: '09:00'
  });

  const [slugError, setSlugError] = useState('');
  const [isCheckingSlug, setIsCheckingSlug] = useState(false);

  // Estados de imágenes para diseño de tienda
  const [logoFile, setLogoFile] = useState<File | undefined>();
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | undefined>();
  const [coverPreview, setCoverPreview] = useState<string | null>(null);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const reservedRoutes = ['login', 'register', 'forgot-password', 'catalogs', 'history', 'profile', 'admin'];

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
        is_public: data.is_public ?? false,
        slug: data.slug || '',
        is_sequence_scheduled: data.is_sequence_scheduled ?? false,
        is_individual_scheduled: data.is_individual_scheduled ?? false,
        sequence_start_time: data.sequence_start_time || '09:00'
      });
      setLogoPreview(data.logo_url);
      setCoverPreview(data.cover_url);
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setLogoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setCoverPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const validateSlug = async (slugToCheck: string): Promise<boolean> => {
    if (!slugToCheck) {
      setSlugError('El enlace es obligatorio si el catálogo es público.');
      return false;
    }

    if (reservedRoutes.includes(slugToCheck)) {
      setSlugError('Este enlace es una palabra reservada del sistema. Elige otra.');
      return false;
    }

    if (!/^[a-z0-9-]+$/.test(slugToCheck)) {
      setSlugError('El enlace solo puede contener letras minúsculas, números y guiones.');
      return false;
    }

    setIsCheckingSlug(true);
    try {
      const { data, error } = await supabase
        .from('catalogs')
        .select('id')
        .eq('slug', slugToCheck)
        .neq('id', catalogId || '00000000-0000-0000-0000-000000000000');

      if (error) throw error;

      if (data && data.length > 0) {
        setSlugError('Este enlace ya está en uso por otro catálogo.');
        return false;
      }

      setSlugError('');
      return true;
    } catch (err) {
      console.error(err);
      return true;
    } finally {
      setIsCheckingSlug(false);
    }
  };

  const handleSlugChange = (val: string) => {
    const sanitizedVal = val.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    setForm(prev => ({ ...prev, slug: sanitizedVal }));
    if (sanitizedVal) {
      validateSlug(sanitizedVal);
    } else {
      setSlugError('El enlace es obligatorio si el catálogo es público.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (form.is_public) {
      const isValid = await validateSlug(form.slug);
      if (!isValid) {
        toast.error('Corrige los errores del enlace antes de guardar.');
        return;
      }
    }

    if (catalogId) {
      const success = await updateCatalog(catalogId, form, logoFile, coverFile);
      if (success) navigate(`/catalogs/${catalogId}`);
    } else {
      const successData = await createCatalog(form, logoFile, coverFile);
      if (successData) navigate('/catalogs');
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

        {/* Sección: Diseño de la Tienda (Logo y Banner) */}
        <div className="card space-y-6">
          <div>
            <h3 className="text-sm font-bold text-primary uppercase tracking-wider flex items-center gap-2">
              <Camera size={16} className="text-[var(--accent)]" /> Diseño de la Tienda
            </h3>
            <p className="text-[10px] text-secondary uppercase tracking-widest mt-1">Logo y banner de portada de tu tienda</p>
          </div>

          <div className="space-y-6 border-t border-border pt-4">
            {/* Portada / Banner */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-secondary uppercase tracking-wider block ml-1">Banner de Portada (Tienda)</label>
              <div 
                onClick={() => coverInputRef.current?.click()}
                className="relative h-28 w-full rounded-2xl overflow-hidden bg-white/5 border border-dashed border-border hover:border-[var(--accent)] cursor-pointer transition-all flex items-center justify-center group"
              >
                {coverPreview ? (
                  <>
                    <img src={coverPreview} alt="Portada" className="w-full h-full object-cover animate-in fade-in duration-300" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[10px] font-black uppercase tracking-wider text-white gap-1.5">
                      <Camera size={16} /> Cambiar Portada
                    </div>
                  </>
                ) : (
                  <div className="text-center p-4">
                    <Camera size={24} className="text-gray-500 mx-auto mb-1 group-hover:scale-110 transition-transform" />
                    <span className="text-[9px] text-secondary font-black uppercase tracking-wider">Subir Banner de Portada</span>
                  </div>
                )}
              </div>
              <input 
                type="file" 
                ref={coverInputRef} 
                className="hidden" 
                accept="image/jpeg,image/jpg,image/png/*"
                onChange={handleCoverChange}
              />
            </div>

            {/* Logo */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-secondary uppercase tracking-wider block ml-1">Logo de la Tienda</label>
              <div className="flex items-center gap-4">
                <div 
                  onClick={() => logoInputRef.current?.click()}
                  className="relative w-16 h-16 rounded-2xl overflow-hidden bg-white/5 border border-dashed border-border hover:border-[var(--accent)] cursor-pointer transition-all flex items-center justify-center group flex-shrink-0"
                >
                  {logoPreview ? (
                    <>
                      <img src={logoPreview} alt="Logo" className="w-full h-full object-cover animate-in fade-in duration-300" />
                      <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                        <Camera size={14} />
                      </div>
                    </>
                  ) : (
                    <Camera size={18} className="text-gray-500 group-hover:scale-110 transition-transform" />
                  )}
                </div>
                <div className="min-w-0 flex-grow">
                  <p className="text-[11px] font-bold text-primary uppercase">Subir Imagen de Logo</p>
                  <p className="text-[9px] text-secondary uppercase tracking-wider mt-0.5">Se recomienda una imagen cuadrada</p>
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    className="mt-1.5 text-[9px] font-black uppercase text-[var(--accent)] hover:underline tracking-wider"
                  >
                    Seleccionar Archivo
                  </button>
                </div>
                <input 
                  type="file" 
                  ref={logoInputRef} 
                  className="hidden" 
                  accept="image/jpeg,image/jpg,image/png/*"
                  onChange={handleLogoChange}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Sección: Catálogo Público / Compartir en la Web */}
        <div className="card space-y-6">
          <div>
            <h3 className="text-sm font-bold text-primary uppercase tracking-wider flex items-center gap-2">
              <Globe size={16} className="text-[var(--accent)]" /> Compartir en la Web
            </h3>
            <p className="text-[10px] text-secondary uppercase tracking-widest mt-1">Configuración de la tienda pública</p>
          </div>

          <div className="space-y-4 border-t border-border pt-4">
            <Switch
              label="Hacer público en la web"
              subtitle="Permite que cualquier persona acceda al catálogo con el enlace"
              checked={form.is_public}
              onChange={(checked) => {
                setForm(prev => {
                  const newState = { ...prev, is_public: checked };
                  if (checked && !prev.slug) {
                    const suggestedSlug = prev.nombre
                      .toLowerCase()
                      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
                      .replace(/[^a-z0-9-]/g, '-')
                      .replace(/-+/g, '-')
                      .replace(/^-|-$/g, '');
                    newState.slug = suggestedSlug;
                    validateSlug(suggestedSlug);
                  }
                  return newState;
                });
              }}
            />

            {form.is_public && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                <Input
                  label="Enlace del Catálogo (Slug)"
                  placeholder="ej: mi-tienda"
                  value={form.slug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  required
                />
                
                {isCheckingSlug && (
                  <p className="text-[10px] text-yellow-500 flex items-center gap-1">
                    <span className="w-2.5 h-2.5 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
                    Comprobando disponibilidad...
                  </p>
                )}

                {slugError ? (
                  <p className="text-xs text-red-500 font-medium flex items-center gap-1">
                    <AlertCircle size={12} /> {slugError}
                  </p>
                ) : (
                  form.slug && (
                    <p className="text-[11px] text-green-500 font-medium bg-green-500/10 p-2 rounded border border-green-500/20">
                      Tu tienda estará disponible en: <br />
                      <span className="underline font-bold select-all">matum.com/{form.slug}</span>
                    </p>
                  )
                )}
              </div>
            )}
          </div>
        </div>

        <div className="card space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-primary uppercase tracking-wider flex items-center gap-2">
                <Zap size={16} className="text-yellow-500" /> Automatización
              </h3>
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
            loading={loading || isCheckingSlug}
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
