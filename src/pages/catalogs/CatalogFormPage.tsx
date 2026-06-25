import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useCatalogs } from '../../hooks/useCatalogs';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Save, Info, Zap, Globe, AlertCircle, Camera, MapPin, Clock, Phone, Mail, Coins, DollarSign, ShoppingBag } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { PageHeader } from '../../components/ui/PageHeader';
import { Switch } from '../../components/ui/Switch';
import { Select } from '../../components/ui/Select';
import { useProfile } from '../../hooks/useProfile';
import { toast } from 'react-hot-toast';
import { useSystemSettings } from '../../hooks/useSystemSettings';

const InstagramIcon = ({ size = 20, className, ...props }: { size?: number; className?: string; [key: string]: any }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
);

const FacebookIcon = ({ size = 20, className, ...props }: { size?: number; className?: string; [key: string]: any }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
);

export const CatalogFormPage = () => {
  const { catalogId } = useParams();
  const navigate = useNavigate();
  const { loading, createCatalog, updateCatalog } = useCatalogs();
  const { getAppUrl } = useSystemSettings();
  
  const { profile } = useProfile();
  const hasDualityAccess = (profile?.plan && profile.plan !== 'free') || profile?.role === 'admin';
  
  const [form, setForm] = useState({
    nombre: '',
    slogan: '',
    descripcion: '',
    is_active: true,
    is_public: false,
    slug: '',
    is_sequence_scheduled: false,
    is_individual_scheduled: false,
    sequence_start_time: '09:00',
    footer_address: '',
    footer_phone: '',
    footer_email: '',
    footer_schedule: '',
    footer_instagram: '',
    footer_facebook: '',
    usd_to_cup_rate: 1.0,
    cup_to_usd_rate: 1.0,
    display_currency: 'original' as 'original' | 'usd' | 'cup' | 'both',
    min_order_amount: 0,
    min_order_currency: 'CUP'
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
        slogan: data.slogan || '',
        descripcion: data.description || '',
        is_active: data.is_active ?? true,
        is_public: data.is_public ?? false,
        slug: data.slug || '',
        is_sequence_scheduled: data.is_sequence_scheduled ?? false,
        is_individual_scheduled: data.is_individual_scheduled ?? false,
        sequence_start_time: data.sequence_start_time || '09:00',
        footer_address: data.footer_address || '',
        footer_phone: data.footer_phone || '',
        footer_email: data.footer_email || '',
        footer_schedule: data.footer_schedule || '',
        footer_instagram: data.footer_instagram || '',
        footer_facebook: data.footer_facebook || '',
        usd_to_cup_rate: Number(data.usd_to_cup_rate) || 1.0,
        cup_to_usd_rate: Number(data.cup_to_usd_rate) > 1.0 ? (1 / Number(data.cup_to_usd_rate)) : (Number(data.cup_to_usd_rate) || 1.0),
        display_currency: data.display_currency || 'original',
        min_order_amount: Number(data.min_order_amount) || 0,
        min_order_currency: data.min_order_currency || 'CUP'
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
            label="Eslogan (Opcional)"
            placeholder="Ej: Los mejores productos al mejor precio"
            value={form.slogan || ''}
            onChange={(e) => setForm({ ...form, slogan: e.target.value })}
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
                      <span className="underline font-bold select-all">
                        {getAppUrl().replace(/^(https?:\/\/)/, '')}/{form.slug}
                      </span>
                    </p>
                  )
                )}
              </div>
            )}
          </div>
        </div>

        {/* Sección: Configuración de Moneda y Tasas */}
        <div className="card space-y-6">
          <div>
            <h3 className="text-sm font-bold text-primary uppercase tracking-wider flex items-center gap-2">
              <Coins size={16} className="text-[var(--accent)]" /> Moneda y Tasa
            </h3>
            <p className="text-[10px] text-secondary uppercase tracking-widest mt-1">Configura la dualidad de moneda en tu tienda</p>
          </div>

          <div className="space-y-4 border-t border-border pt-4">
            {!hasDualityAccess ? (
              <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10 text-center space-y-3">
                <p className="text-xs text-amber-400 font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 animate-pulse">
                  👑 Función Básico / Premium
                </p>
                <p className="text-[11px] text-secondary leading-relaxed">
                  La dualidad de moneda te permite ingresar productos en CUP o USD y mostrarlos convertidos automáticamente en tu tienda. Actualiza tu plan para habilitar esta opción.
                </p>
              </div>
            ) : (
              <div className="space-y-4 animate-in fade-in duration-300">
                <Select
                  label="Visualización en la Tienda"
                  value={form.display_currency}
                  onChange={(e) => setForm({ ...form, display_currency: e.target.value as any })}
                >
                  <option value="original" className="bg-surface text-primary">Moneda Original del Producto</option>
                  <option value="usd" className="bg-surface text-primary">Mostrar solo en USD ($)</option>
                  <option value="cup" className="bg-surface text-primary">Mostrar solo en CUP (Cubano)</option>
                  <option value="both" className="bg-surface text-primary">Mostrar ambas monedas (USD / CUP)</option>
                </Select>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Precio de Venta del Dólar (USD en CUP)"
                    type="number"
                    step="0.01"
                    placeholder="Ej: 600.00"
                    value={form.usd_to_cup_rate}
                    onChange={(e) => setForm({ ...form, usd_to_cup_rate: Number(e.target.value) || 1.0 })}
                    icon={DollarSign}
                    helperText="Precio en CUP al que vendes el dólar. Usado cuando un producto en USD se muestra en CUP."
                  />

                  <Input
                    label="Precio de Compra del Dólar (USD en CUP)"
                    type="number"
                    step="1"
                    placeholder="Ej: 580"
                    value={form.cup_to_usd_rate > 0 ? Math.round(1 / form.cup_to_usd_rate) : ''}
                    onChange={(e) => {
                      const val = Number(e.target.value) || 0;
                      setForm({ ...form, cup_to_usd_rate: val > 0 ? 1 / val : 1.0 });
                    }}
                    icon={DollarSign}
                    helperText="Precio en CUP al que compras el dólar. Usado cuando un producto en CUP se muestra en USD."
                  />
                </div>
                <p className="text-[10px] text-secondary italic">
                  * Los precios de tus productos se convertirán usando estas tasas de cambio en la tienda pública.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Sección: Monto Mínimo de Pedido */}
        <div className="card space-y-6">
          <div>
            <h3 className="text-sm font-bold text-primary uppercase tracking-wider flex items-center gap-2">
              <ShoppingBag size={16} className="text-[var(--accent)]" /> Monto Mínimo de Pedido
            </h3>
            <p className="text-[10px] text-secondary uppercase tracking-widest mt-1">Configura un importe mínimo para que tus clientes puedan solicitar el pedido</p>
          </div>

          <div className="space-y-4 border-t border-border pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Monto Mínimo de Compra"
                type="number"
                step="0.01"
                placeholder="Ej: 1500.00"
                value={form.min_order_amount || ''}
                onChange={(e) => setForm({ ...form, min_order_amount: Number(e.target.value) || 0 })}
                icon={Coins}
              />

              <Select
                label="Moneda del Monto Mínimo"
                value={form.min_order_currency}
                onChange={(e) => setForm({ ...form, min_order_currency: e.target.value })}
              >
                <option value="CUP" className="bg-surface text-primary">CUP (Pesos Cubanos)</option>
                <option value="USD" className="bg-surface text-primary">USD (Dólares Estadounidenses)</option>
              </Select>
            </div>
            <p className="text-[10px] text-secondary italic">
              * Si configuras un monto mínimo, los pedidos que no alcancen esta cifra (calculada según la tasa de cambio) no podrán enviarse a WhatsApp. Deja en 0 para no requerir mínimo.
            </p>
          </div>
        </div>

        {/* Sección: Pie de Página y Contacto */}
        <div className="card space-y-6">
          <div>
            <h3 className="text-sm font-bold text-primary uppercase tracking-wider flex items-center gap-2">
              <MapPin size={16} className="text-[var(--accent)]" /> Pie de Página y Contacto
            </h3>
            <p className="text-[10px] text-secondary uppercase tracking-widest mt-1">Datos de contacto y ubicación para mostrar al final de tu tienda</p>
          </div>

          <div className="space-y-4 border-t border-border pt-4">
            <Input
              label="Dirección Física de la Tienda"
              placeholder="Ej: Calle Principal #123, Ciudad"
              value={form.footer_address}
              onChange={(e) => setForm({ ...form, footer_address: e.target.value })}
              icon={MapPin}
            />

            <Input
              label="Horario de Atención"
              placeholder="Ej: Lunes a Sábado: 9:00 AM - 6:00 PM"
              value={form.footer_schedule}
              onChange={(e) => setForm({ ...form, footer_schedule: e.target.value })}
              icon={Clock}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Teléfono de Contacto"
                placeholder="Ej: +53 51234567"
                value={form.footer_phone}
                onChange={(e) => setForm({ ...form, footer_phone: e.target.value })}
                icon={Phone}
              />

              <Input
                label="Correo Electrónico"
                placeholder="Ej: contacto@tienda.com"
                type="email"
                value={form.footer_email}
                onChange={(e) => setForm({ ...form, footer_email: e.target.value })}
                icon={Mail}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Usuario de Instagram"
                placeholder="Ej: mi_tienda"
                value={form.footer_instagram}
                onChange={(e) => setForm({ ...form, footer_instagram: e.target.value })}
                icon={InstagramIcon}
              />

              <Input
                label="Usuario de Facebook"
                placeholder="Ej: mitienda.facebook"
                value={form.footer_facebook}
                onChange={(e) => setForm({ ...form, footer_facebook: e.target.value })}
                icon={FacebookIcon}
              />
            </div>
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
