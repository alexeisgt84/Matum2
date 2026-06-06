import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Switch } from '../../components/ui/Switch';
import { RichTextarea } from '../../components/ui/RichTextarea';
import { PageHeader } from '../../components/ui/PageHeader';
import { EvolutionConfig } from '../../components/profile/EvolutionConfig';
import { GroupCard } from '../../components/groups/GroupCard';
import { LinkGroupsModal } from '../../components/groups/LinkGroupsModal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Skeleton } from '../../components/ui/Skeleton';
import { ExchangeRatesModal } from '../../components/catalogs/ExchangeRatesModal';
import { NemuImportModal } from '../../components/catalogs/NemuImportModal';
import { useCatalogs } from '../../hooks/useCatalogs';
import { Select } from '../../components/ui/Select';
import { useProfile } from '../../hooks/useProfile';
import { useWhatsAppGroups } from '../../hooks/useWhatsAppGroups';
import { useMessages } from '../../hooks/useMessages';
import { useEvolution } from '../../hooks/useEvolution';
import { usePlanLimits } from '../../hooks/usePlanLimits';
import { useHistory } from '../../hooks/useHistory';
import { EmptyState } from '../../components/ui/EmptyState';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'react-hot-toast';
import type { RichTextareaHandle } from '../../types/ui';
import type { SequenceSchedule } from '../../types/catalog';
import { 
  ShoppingBag, 
  Smartphone, 
  Users, 
  Zap, 
  Layout, 
  Save, 
  Camera, 
  Globe, 
  AlertCircle, 
  Clock, 
  Trash2, 
  RotateCcw, 
  CheckCircle2, 
  Info,
  Server,
  ZapOff,
  Palette,
  MapPin,
  Phone,
  Mail,
  Coins,
  DollarSign,
  ChevronRight
} from 'lucide-react';

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

// Función para determinar si un color hexadecimal es claro u oscuro (YIQ)
const getContrastColor = (hexColor: string) => {
  if (!hexColor || !/^#[0-9A-F]{6}$/i.test(hexColor)) return '#ffffff';
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 128 ? '#121212' : '#ffffff';
};

// Función para obtener texto secundario en base al primario
const getSecondaryTextColor = (hexColor: string) => {
  const contrast = getContrastColor(hexColor);
  return contrast === '#ffffff' ? '#a0a0a0' : '#4b5563';
};

type SettingsTab = 'menu' | 'store' | 'whatsapp' | 'groups' | 'automation' | 'templates' | 'history';

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
  tags?: string[];
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
  sectionRef,
  tags
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
      {(tags || [
        '{product_name}',
        '{product_description}',
        '{product_price}',
        '{product_currency}',
        '{catalog_name}',
        '{contact_number}',
        '{store_url}'
      ]).map(tag => (
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

const HistoryTabContent = ({ catalogId }: { catalogId: string }) => {
  const { logs, loading, getLogs, clearLogs } = useHistory(catalogId);

  useEffect(() => {
    getLogs();
  }, [getLogs]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div>
          <h3 className="text-sm font-bold text-primary uppercase tracking-wider">Actividad de Envíos</h3>
          <p className="text-secondary text-[10px] mt-0.5 font-bold uppercase opacity-60">Mensajes enviados desde este catálogo</p>
        </div>
        {logs.length > 0 && (
          <Button
            variant="danger"
            size="sm"
            icon={Trash2}
            onClick={clearLogs}
            loading={loading}
            className="px-2 py-1.5"
          >
            Limpiar
          </Button>
        )}
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="card p-5 flex items-start gap-4 animate-pulse border-border">
              <Skeleton className="h-12 w-12 rounded-2xl flex-shrink-0" />
              <div className="flex-1 space-y-3">
                <div className="flex justify-between items-start">
                  <Skeleton className="h-5 w-1/3" />
                  <Skeleton className="h-4 w-12 rounded-lg" />
                </div>
                <Skeleton className="h-4 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : logs.length === 0 ? (
        <EmptyState
          icon={Clock}
          title="Sin actividad reciente"
          description="Aquí aparecerán los detalles de los envíos de este catálogo realizados a tus grupos."
        />
      ) : (
        <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
          {logs.map((log) => (
            <div key={log.id} className="card group hover:border-accent/20 transition-all flex items-start gap-4 p-5 bg-surface">
              <div className={`p-3 rounded-2xl flex-shrink-0 ${
                log.status === 'success' ? 'bg-accent/10 text-accent' : 'bg-danger/10 text-danger'
              }`}>
                {log.status === 'success' ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                  <h3 className="text-primary font-bold text-sm truncate uppercase tracking-tight group-hover:text-accent transition-colors">
                    {log.catalog_name}
                  </h3>
                  <span className="text-[10px] text-secondary font-bold whitespace-nowrap ml-2 bg-surface-hover px-2 py-0.5 rounded-lg border border-border">
                    {format(new Date(log.created_at), "HH:mm")}
                  </span>
                </div>
                
                <p className="text-secondary text-[11px] mt-2 leading-relaxed">
                  Enviado al grupo: <span className="text-primary font-medium">{log.group_name}</span>
                </p>

                <div className="flex items-center gap-2 mt-4 text-[10px] font-bold text-secondary uppercase tracking-widest">
                  <div className="w-1.5 h-1.5 rounded-full bg-secondary/20" />
                  <span>{format(new Date(log.created_at), "d 'de' MMMM, yyyy", { locale: es })}</span>
                </div>

                {log.status === 'failed' && log.error_message && (
                  <div className="mt-4 p-3 bg-danger/5 border border-danger/10 rounded-xl">
                    <p className="text-[10px] text-danger font-medium italic">
                      Error: {log.error_message}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const CatalogSettingsPage = () => {
  const { catalogId } = useParams();
  const navigate = useNavigate();
  
  const { profile } = useProfile();
  const hasDualityAccess = (profile?.plan && profile.plan !== 'free') || profile?.role === 'admin';
  const isPremium = profile?.plan === 'premium' || profile?.role === 'admin';
  
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (searchParams.get('tab') as SettingsTab) || 'menu';
  const [activeTab, setActiveTabState] = useState<SettingsTab>(initialTab);

  const setActiveTab = (tab: SettingsTab) => {
    setActiveTabState(tab);
    setSearchParams(prev => {
      prev.set('tab', tab);
      return prev;
    });
  };
  const [catalog, setCatalog] = useState<any>(null);
  const [catLoading, setCatLoading] = useState(true);

  // Hook para actualizar catálogos
  const { loading: updateLoading, updateCatalog } = useCatalogs();

  // Estados del Formulario de la Tienda
  const [storeForm, setStoreForm] = useState({
    nombre: '',
    descripcion: '',
    is_active: true,
    is_public: false,
    slug: '',
    is_sequence_scheduled: false,
    is_individual_scheduled: false,
    sequence_start_time: '09:00',
    primary_color: '#ff782e',
    background_color: '#0a0a0a',
    surface_color: '#1a1a1a',
    text_color: '#ffffff',
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
  const [logoFile, setLogoFile] = useState<File | undefined>();
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | undefined>();
  const [coverPreview, setCoverPreview] = useState<string | null>(null);

  const [isExchangeRatesOpen, setIsExchangeRatesOpen] = useState(false);
  const [isNemuImportOpen, setIsNemuImportOpen] = useState(false);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const reservedRoutes = ['login', 'register', 'forgot-password', 'catalogs', 'history', 'profile', 'admin'];

  // Estados del Formulario de Plantillas
  const [templatesForm, setTemplatesForm] = useState({
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

  // WhatsApp e Instancia
  const { instance, loading: instanceLoading, checkStatus } = useEvolution(catalogId);
  const hasInstance = instance?.status === 'connected';

  // Redirigir si la pestaña activa requiere conexión y no la hay
  useEffect(() => {
    if ((activeTab === 'groups' || activeTab === 'automation') && !hasInstance) {
      setActiveTab('whatsapp');
    }
  }, [activeTab, hasInstance]);

  // Hooks de Grupos
  const { 
    linkedGroups, 
    availableGroups,
    loading: groupsLoading, 
    getLinkedGroups, 
    fetchAvailableGroups,
    linkGroup,
    unlinkGroup, 
    toggleGroupStatus, 
    applyGroupPreset 
  } = useWhatsAppGroups(catalogId);

  const [isLinkGroupOpen, setIsLinkGroupOpen] = useState(false);
  const [groupUnlinkId, setGroupUnlinkId] = useState<string | null>(null);

  // Presets de Grupos
  const [presets, setPresets] = useState<Record<number, string[]>>({ 1: [], 2: [], 3: [] });
  const presetTimeoutRef = useRef<Record<number, any>>({});
  const isLongPressRef = useRef<Record<number, boolean>>({});

  // Hooks de Mensajes (para restaurar y horarios aleatorios)
  const { messages, getMessages } = useMessages(catalogId);

  // Estados y estadísticas de Cola de Envío
  const [queueItems, setQueueItems] = useState<any[]>([]);
  const [isQueueLoading, setIsQueueLoading] = useState(false);
  const [isClearQueueConfirmOpen, setIsClearQueueConfirmOpen] = useState(false);
  const [isClearingQueue, setIsClearingQueue] = useState(false);
  const [isRestoreConfirmOpen, setIsRestoreConfirmOpen] = useState(false);
  const [queueStats, setQueueStats] = useState({ pending: 0, sent: 0, error: 0 });

  // Cargar presets de localStorage
  useEffect(() => {
    if (catalogId) {
      const loadedPresets: Record<number, string[]> = { 1: [], 2: [], 3: [] };
      for (let i = 1; i <= 3; i++) {
        try {
          const data = localStorage.getItem(`matum_group_preset_${catalogId}_${i}`);
          if (data) loadedPresets[i] = JSON.parse(data);
        } catch (e) {
          console.error(e);
        }
      }
      setPresets(loadedPresets);
    }
  }, [catalogId]);

  // Carga inicial del catálogo
  useEffect(() => {
    if (catalogId) {
      loadCatalog();
      getLinkedGroups();
      getMessages();
    }
  }, [catalogId]);

  const loadCatalog = async () => {
    setCatLoading(true);
    try {
      const { data, error } = await supabase
        .from('catalogs')
        .select('*')
        .eq('id', catalogId)
        .single();
      
      if (error) throw error;
      if (data) {
        setCatalog(data);
        setStoreForm({
          nombre: data.name,
          descripcion: data.description || '',
          is_active: data.is_active ?? true,
          is_public: data.is_public ?? false,
          slug: data.slug || '',
          is_sequence_scheduled: data.is_sequence_scheduled ?? false,
          is_individual_scheduled: data.is_individual_scheduled ?? false,
          sequence_start_time: data.sequence_start_time || '09:00',
          primary_color: data.primary_color || '#ff782e',
          background_color: data.background_color || '#0a0a0a',
          surface_color: data.surface_color || '#1a1a1a',
          text_color: data.text_color || '#ffffff',
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

        setTemplatesForm({
          plantilla: data.template || '',
          share_template: data.share_template || '✨ *¡Mira este producto!* ✨\n\n🛍️ *{product_name}*\n💵 *Precio:* {product_price} {product_currency}\n\n📝 *Detalles:* {product_description}\n\n💬 Escríbenos para ordenarlo o ver más detalles en el catálogo: *{catalog_name}*',
          out_of_stock_template: data.out_of_stock_template || '⚠️ *¡Se agotó!* ⚠️\n\nEl artículo *{product_name}* ha volado y no nos queda stock por el momento.\n\n👉 Mira otros productos similares en nuestro catálogo: *{catalog_name}*',
          new_product_template: data.new_product_template || '🔥 *¡NUEVO INGRESO!* 🔥\n\n🛍️ *{product_name}*\n💵 *Precio:* {product_price} {product_currency}\n\n📝 *Detalles:* {product_description}\n\n🚀 ¡Pide el tuyo ahora escribiéndonos antes de que se agote!',
          available_template: data.available_template || '🎉 *¡DE VUELTA EN STOCK!* 🎉\n\nLo estabas esperando y ya está disponible nuevamente:\n🛍️ *{product_name}*\n💵 *Precio:* {product_price} {product_currency}\n\n📝 *Detalles:* {product_description}\n\n⚡ Las unidades son muy limitadas. ¡Escríbenos para asegurar el tuyo ahora mismo!',
        });

        fetchQueueStats();
      }
    } catch (err: any) {
      toast.error('Error al cargar datos: ' + err.message);
    } finally {
      setCatLoading(false);
    }
  };

  const fetchQueueStats = async () => {
    if (!catalogId) return;
    try {
      const { data: pending } = await supabase
        .from('wa_message_queue')
        .select('count', { count: 'exact', head: true })
        .eq('catalog_id', catalogId)
        .eq('status', 'pending');

      const { data: errors } = await supabase
        .from('wa_message_queue')
        .select('count', { count: 'exact', head: true })
        .eq('catalog_id', catalogId)
        .eq('status', 'error');
      
      const { data: sent } = await supabase
        .from('wa_message_queue')
        .select('count', { count: 'exact', head: true })
        .eq('catalog_id', catalogId)
        .eq('status', 'sent');

      setQueueStats({
        pending: (pending as any)?.count || 0,
        sent: (sent as any)?.count || 0,
        error: (errors as any)?.count || 0
      });
    } catch (err) {
      console.error('Error fetching queue stats:', err);
    }
  };

  const fetchQueueItems = async () => {
    if (!catalogId) return;
    setIsQueueLoading(true);
    try {
      const { data, error } = await supabase
        .from('wa_message_queue')
        .select('*')
        .eq('catalog_id', catalogId)
        .in('status', ['pending', 'error'])
        .order('scheduled_at', { ascending: true })
        .limit(30);
      
      if (error) throw error;
      setQueueItems(data || []);
    } catch (err: any) {
      toast.error('Error al cargar cola: ' + err.message);
    } finally {
      setIsQueueLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'automation') {
      fetchQueueItems();
      fetchQueueStats();
    }
  }, [activeTab]);

  // Manejo de Tienda (Logo, Banner y Slug)
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
      setSlugError('Este enlace es una palabra reservada. Elige otra.');
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
    setStoreForm(prev => ({ ...prev, slug: sanitizedVal }));
    if (sanitizedVal) {
      validateSlug(sanitizedVal);
    } else {
      setSlugError('El enlace es obligatorio si el catálogo es público.');
    }
  };

  const handleSaveStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catalogId) return;

    if (storeForm.is_public) {
      const isValid = await validateSlug(storeForm.slug);
      if (!isValid) {
        toast.error('Corrige los errores del enlace antes de guardar.');
        return;
      }
    }

    const success = await updateCatalog(catalogId, storeForm, logoFile, coverFile);
    if (success) {
      toast.success('Ajustes de la tienda guardados');
      loadCatalog();
    }
  };

  const updateExchangeRates = async (usdToCup: number, cupToUsd: number) => {
    if (!catalogId) return;
    try {
      const { error } = await supabase
        .from('catalogs')
        .update({ 
          usd_to_cup_rate: usdToCup,
          cup_to_usd_rate: cupToUsd
        })
        .eq('id', catalogId);
      
      if (error) throw error;
      setCatalog((prev: any) => ({ 
        ...prev, 
        usd_to_cup_rate: usdToCup,
        cup_to_usd_rate: cupToUsd
      }));
      setStoreForm(prev => ({
        ...prev,
        usd_to_cup_rate: usdToCup,
        cup_to_usd_rate: cupToUsd
      }));
      toast.success('Tasas de cambio actualizadas');
    } catch (err: any) {
      toast.error('Error al actualizar tasas de cambio');
      throw err;
    }
  };

  // Manejo de Presets de Grupos
  const savePreset = (presetNum: number) => {
    if (!catalogId) return;
    const activeJids = linkedGroups.filter(g => g.is_active).map(g => g.group_id);
    localStorage.setItem(`matum_group_preset_${catalogId}_${presetNum}`, JSON.stringify(activeJids));
    setPresets(prev => ({ ...prev, [presetNum]: activeJids }));
    toast.success(`Configuración guardada en G${presetNum}`);
  };

  const applyPreset = async (presetNum: number) => {
    const savedJids = presets[presetNum];
    if (!savedJids || savedJids.length === 0) {
      toast.error(`El acceso rápido "G${presetNum}" está vacío. Activa los grupos deseados y mantén presionado este botón para guardarlo.`);
      return;
    }
    const linkedGroupJids = linkedGroups.map(g => g.group_id);
    const validJidsToActive = savedJids.filter(jid => linkedGroupJids.includes(jid));
    await applyGroupPreset(validJidsToActive);
  };

  const handlePresetPointerDown = (e: React.PointerEvent, presetNum: number) => {
    isLongPressRef.current[presetNum] = false;
    if (presetTimeoutRef.current[presetNum]) {
      clearTimeout(presetTimeoutRef.current[presetNum]);
    }
    presetTimeoutRef.current[presetNum] = setTimeout(() => {
      isLongPressRef.current[presetNum] = true;
      savePreset(presetNum);
      if (navigator.vibrate) navigator.vibrate(100);
      presetTimeoutRef.current[presetNum] = null;
    }, 1200);
  };

  const handlePresetPointerUp = (presetNum: number) => {
    if (presetTimeoutRef.current[presetNum]) {
      clearTimeout(presetTimeoutRef.current[presetNum]);
      presetTimeoutRef.current[presetNum] = null;
    }
    if (!isLongPressRef.current[presetNum]) {
      applyPreset(presetNum);
    }
  };

  const handlePresetPointerCancel = (presetNum: number) => {
    if (presetTimeoutRef.current[presetNum]) {
      clearTimeout(presetTimeoutRef.current[presetNum]);
      presetTimeoutRef.current[presetNum] = null;
    }
  };

  // Acciones de Automatización
  const handleSaveAutomation = async () => {
    if (!catalogId) return;
    const success = await updateCatalog(catalogId, {
      is_sequence_scheduled: storeForm.is_sequence_scheduled,
      is_individual_scheduled: storeForm.is_individual_scheduled,
      sequence_start_time: storeForm.sequence_start_time
    });
    if (success) {
      toast.success('Ajustes de automatización guardados');
      loadCatalog();
    }
  };

  const handleClearQueue = async () => {
    if (!catalogId) return;
    setIsClearingQueue(true);
    const toastId = toast.loading('Limpiando cola de envío…');
    try {
      const { error } = await supabase
        .from('wa_message_queue')
        .delete()
        .eq('catalog_id', catalogId)
        .in('status', ['pending', 'error']);
      
      if (error) throw error;
      toast.success('Cola de envío limpiada', { id: toastId });
      setQueueItems([]);
      fetchQueueStats();
      setIsClearQueueConfirmOpen(false);
    } catch (err: any) {
      toast.error('Error al limpiar cola: ' + err.message, { id: toastId });
    } finally {
      setIsClearingQueue(false);
    }
  };

  const randomizeSequenceSchedules = async () => {
    if (!catalogId || !storeForm.sequence_start_time) {
      toast.error('Establece un horario de inicio primero');
      return;
    }
    
    const sequenceMessages = [...messages].filter(m => m.is_sequence).sort((a, b) => a.sequence_order - b.sequence_order);
    if (sequenceMessages.length === 0) {
      toast.error('No hay mensajes en la secuencia');
      return;
    }

    const baseTime = storeForm.sequence_start_time;
    const [hours, minutes] = baseTime.split(':').map(Number);
    
    let currentTime = new Date();
    currentTime.setHours(hours, minutes, 0, 0);

    const updates = sequenceMessages.map((msg, index) => {
      if (index > 0) {
        currentTime.setMinutes(currentTime.getMinutes() + 1);
      }
      
      const randomMargin = Math.floor(Math.random() * 6); 
      const scheduledDate = new Date(currentTime);
      scheduledDate.setMinutes(scheduledDate.getMinutes() + randomMargin);
      
      const HH = String(scheduledDate.getHours()).padStart(2, '0');
      const mm = String(scheduledDate.getMinutes()).padStart(2, '0');
      
      return {
        id: msg.id,
        catalog_id: catalogId,
        scheduled_time: `${HH}:${mm}`
      };
    });

    const toastId = toast.loading('Generando horarios aleatorios...');
    try {
      const { error } = await supabase.from('whatsapp_messages').upsert(updates);
      if (error) throw error;
      toast.success('Horarios aleatorios generados con éxito', { id: toastId });
      getMessages();
    } catch (err: any) {
      toast.error('Error al generar horarios: ' + err.message, { id: toastId });
    }
  };

  const restoreDefaultMessages = async () => {
    if (!catalogId) return;
    
    const toastId = toast.loading('Restaurando mensajes...');
    try {
      // 1. Eliminar todos los mensajes del catálogo
      const { error: delError } = await supabase
        .from('whatsapp_messages')
        .delete()
        .eq('catalog_id', catalogId);
      
      if (delError) throw delError;

      // 2. Insertar predeterminados
      const defaultMessages = [
        {
          name: 'Bienvenido',
          content: '¡Bienvenido al grupo de *{{nombre_catalogo}}*! 🚀 Estamos felices de tenerte aquí. Pronto recibirás nuestro catálogo de productos en esta misma secuencia.',
          is_sequence: true,
          is_individual: false,
          type: 'text' as const,
          sequence_order: 0
        },
        {
          name: 'Reglas del grupo',
          content: '📋 *Reglas de {{nombre_catalogo}}*:\n1. Mantén un trato respetuoso.\n2. No compartas contenido ajeno o spam.\n3. Pedidos por mensaje privado para mayor privacidad.',
          is_sequence: true,
          is_individual: false,
          type: 'text' as const,
          sequence_order: 1
        },
        {
          name: 'Invitación a preguntar',
          content: '🛍️ ¿Ya viste algo que te encante en *{{nombre_catalogo}}*? Si tienes dudas sobre tallas, colores o envíos, ¡aquí estamos para ayudarte!',
          is_sequence: false,
          is_individual: true,
          type: 'text' as const,
          scheduled_time: '10:00',
          sequence_order: 0
        },
        {
          name: 'Garantía',
          content: '✨ En *{{nombre_catalogo}}* nos esforzamos por ofrecerte solo lo mejor. Cada producto es seleccionado con amor y detalle. ¡Tu satisfacción es nuestra prioridad!',
          is_sequence: false,
          is_individual: true,
          type: 'text' as const,
          sequence_order: 0
        },
        {
          name: 'Catálogo',
          content: 'Productos del catálogo',
          type: 'catalog_products' as const,
          is_sequence: true,
          is_individual: false,
          sequence_order: 2
        },
        {
          name: 'Como comprar',
          content: '🛒 *¿Cómo comprar en {{nombre_catalogo}}?*\n1. Mira el catálogo.\n2. Envíanos captura del producto.\n3. Acordamos el pago y envío. ¡Así de fácil!',
          is_sequence: true,
          is_individual: false,
          type: 'text' as const,
          sequence_order: 3
        },
        {
          name: 'Nuestras redes',
          content: '📱 ¡No te pierdas nada! Síguenos también en nuestras redes sociales para ver más de *{{nombre_catalogo}}*. ¡Te esperamos!',
          is_sequence: false,
          is_individual: true,
          type: 'text' as const,
          sequence_order: 0
        },
        {
          name: 'Cerrado por hoy',
          content: '🌙 ¡Gracias por acompañarnos hoy en *{{nombre_catalogo}}*! Nuestro horario de atención ha finalizado. Seguiremos respondiendo mañana. ¡Descansen!',
          is_sequence: false,
          is_individual: true,
          type: 'text' as const,
          scheduled_time: '17:00',
          sequence_order: 0
        }
      ];

      const messagesToInsert = defaultMessages.map(m => ({
        ...m,
        catalog_id: catalogId
      }));

      const { error: insError } = await supabase
        .from('whatsapp_messages')
        .insert(messagesToInsert);
      
      if (insError) throw insError;

      toast.success('Mensajes restaurados con éxito', { id: toastId });
      getMessages();
      setIsRestoreConfirmOpen(false);
    } catch (err: any) {
      toast.error('Error al restaurar: ' + err.message, { id: toastId });
    }
  };

  // Guardar Plantillas
  const handleSaveTemplates = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catalogId) return;

    const success = await updateCatalog(catalogId, templatesForm);
    if (success) {
      toast.success('Plantillas actualizadas correctamente');
      loadCatalog();
    }
  };

  if (catLoading) {
    return (
      <div className="p-4 max-w-lg mx-auto">
        <div className="space-y-6">
          <div className="flex justify-between items-center py-4">
            <div className="space-y-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          <Skeleton className="h-24 w-full rounded-2xl" />
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </div>
    );
  }

  const tabs: { id: SettingsTab; label: string; icon: any }[] = [
    { id: 'store' as SettingsTab, label: 'Tienda', icon: ShoppingBag },
    { id: 'whatsapp' as SettingsTab, label: 'WhatsApp', icon: Smartphone },
    ...(hasInstance ? [
      { id: 'groups' as SettingsTab, label: 'Grupos', icon: Users },
      { id: 'automation' as SettingsTab, label: 'Automatización', icon: Zap }
    ] : []),
    { id: 'templates' as SettingsTab, label: 'Plantillas', icon: Layout },
    { id: 'history' as SettingsTab, label: 'Historial', icon: Clock },
  ];

  interface MenuItemProps {
    icon: React.ComponentType<{ className?: string; size?: number }>;
    label: string;
    value?: string;
    onClick: () => void;
    showArrow?: boolean;
    iconBgColorClass?: string;
    isLast?: boolean;
  }

  const MenuItem: React.FC<MenuItemProps> = ({
    icon: Icon,
    label,
    value,
    onClick,
    showArrow = true,
    iconBgColorClass = 'bg-accent/10 text-accent',
    isLast = false,
  }) => {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`w-full flex items-center justify-between p-4 transition-all hover:bg-[var(--surface-hover)] active:bg-[var(--border)] outline-none text-left ${
          !isLast ? 'border-b border-[var(--border)]' : ''
        }`}
      >
        <div className="flex items-center gap-3.5 min-w-0">
          <div className={`p-2.5 rounded-xl flex-shrink-0 flex items-center justify-center transition-transform active:scale-95 ${iconBgColorClass}`}>
            <Icon size={18} />
          </div>
          <div className="min-w-0">
            <span className="block font-medium text-sm leading-tight text-primary truncate">
              {label}
            </span>
            {value && (
              <span className="block text-secondary text-[11px] font-semibold mt-0.5 leading-tight">
                {value}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 text-secondary">
          {showArrow && (
            <ChevronRight size={16} className="opacity-50" />
          )}
        </div>
      </button>
    );
  };

  return (
    <div className="p-4 max-w-lg mx-auto pb-32">
      <PageHeader 
        title={activeTab === 'menu' ? "Configuración" : tabs.find(t => t.id === activeTab)?.label || "Configuración"} 
        subtitle={catalog?.name || 'Ajustes de Catálogo'}
      />

      {activeTab !== 'menu' && (
        <button
          onClick={() => setActiveTab('menu')}
          className="inline-flex items-center gap-1.5 text-xs text-secondary hover:text-primary transition-colors font-bold uppercase tracking-wider mb-5"
        >
          ← Volver al Menú
        </button>
      )}

      {activeTab === 'menu' ? (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div>
            <h3 className="text-[10px] font-bold text-secondary uppercase tracking-widest mb-2 ml-1">
              Ajustes de Catálogo
            </h3>
            <div className="card p-0 overflow-hidden">
              <MenuItem
                icon={ShoppingBag}
                label="Tienda"
                value="Configuración general, colores, logo y enlaces de la tienda"
                onClick={() => setActiveTab('store')}
                iconBgColorClass="bg-purple-500/10 text-purple-600 dark:text-purple-400"
              />
              <MenuItem
                icon={Coins}
                label="Tasa de Cambio"
                value="Configura los precios de compra y venta del dólar (USD a CUP)"
                onClick={() => setIsExchangeRatesOpen(true)}
                iconBgColorClass="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              />
              <MenuItem
                icon={Layout}
                label="Plantillas"
                value="Personaliza las notificaciones y mensajes de stock del catálogo"
                onClick={() => setActiveTab('templates')}
                iconBgColorClass="bg-blue-500/10 text-blue-600 dark:text-blue-400"
              />
              <MenuItem
                icon={Smartphone}
                label="WhatsApp"
                value="Conecta tu número y gestiona grupos o colas de automatización"
                onClick={() => setActiveTab('whatsapp')}
                iconBgColorClass="bg-orange-500/10 text-orange-600 dark:text-orange-400"
              />
              {isPremium && (
                <MenuItem
                  icon={Globe}
                  label="Vincular con Nemu"
                  value="Importa productos y sincroniza el catálogo con tu app Nemu"
                  onClick={() => setIsNemuImportOpen(true)}
                  iconBgColorClass="bg-pink-500/10 text-pink-600 dark:text-pink-400"
                />
              )}
              <MenuItem
                icon={Clock}
                label="Historial de Envíos"
                value="Visualiza el historial y estados de los mensajes de la cola"
                onClick={() => setActiveTab('history')}
                iconBgColorClass="bg-secondary/10 text-secondary"
                isLast
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
        
        {/* PESTAÑA: TIENDA */}
        {activeTab === 'store' && (
          <form onSubmit={handleSaveStore} className="space-y-6 animate-in fade-in duration-300">
            <div className="card space-y-4">
              <h3 className="text-sm font-bold text-primary uppercase tracking-wider">Detalles Generales</h3>
              <Input
                label="Nombre del Catálogo"
                placeholder="Ej: Ofertas del Mes"
                value={storeForm.nombre}
                onChange={(e) => setStoreForm({ ...storeForm, nombre: e.target.value })}
                required
              />
              <Input
                label="Descripción (Opcional)"
                placeholder="Ej: Selección de productos con descuento"
                multiline
                rows={3}
                value={storeForm.descripcion}
                onChange={(e) => setStoreForm({ ...storeForm, descripcion: e.target.value })}
              />
            </div>

            {/* Diseño de la tienda */}
            <div className="card space-y-6">
              <div>
                <h3 className="text-sm font-bold text-primary uppercase tracking-wider flex items-center gap-2">
                  <Camera size={16} className="text-[var(--accent)]" /> Diseño de la Tienda
                </h3>
                <p className="text-[10px] text-secondary uppercase tracking-widest mt-1">Logo y banner de portada de tu tienda</p>
              </div>

              <div className="space-y-6 border-t border-border/40 pt-4">
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
                      className="relative w-16 h-16 rounded-2xl overflow-hidden bg-white/5 border border-dashed border-border/80 hover:border-[var(--accent)] cursor-pointer transition-all flex items-center justify-center group flex-shrink-0"
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

            {/* Colores de la Tienda */}
            <div className="card space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-sm font-bold text-primary uppercase tracking-wider flex items-center gap-2">
                    <Palette size={16} className="text-[var(--accent)]" /> Colores de la Tienda
                  </h3>
                  <p className="text-[10px] text-secondary uppercase tracking-widest mt-1">Personaliza la paleta de colores de tu tienda pública</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setStoreForm(prev => ({
                      ...prev,
                      primary_color: '#ff782e',
                      background_color: '#0a0a0a',
                      surface_color: '#1a1a1a',
                      text_color: '#ffffff'
                    }));
                    toast.success('Colores restablecidos a los predeterminados');
                  }}
                  className="flex items-center gap-1 text-[9px] font-black uppercase text-secondary hover:text-[var(--accent)] tracking-wider border border-border px-2.5 py-1.5 rounded-xl bg-surface hover:bg-surface-hover transition-colors"
                >
                  <RotateCcw size={10} /> Restablecer
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 border-t border-border/40 pt-4">
                {/* Color Primario */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-secondary uppercase tracking-wider block ml-0.5">Acento / Botones</label>
                  <div className="flex items-center gap-2 bg-surface-hover/50 p-2 rounded-xl border border-border">
                    <input
                      type="color"
                      value={storeForm.primary_color}
                      onChange={(e) => setStoreForm(prev => ({ ...prev, primary_color: e.target.value }))}
                      className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0 p-0 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border-0 [&::-webkit-color-swatch]:rounded-lg"
                    />
                    <span className="text-[10px] font-mono font-bold uppercase text-primary select-all">
                      {storeForm.primary_color}
                    </span>
                  </div>
                </div>

                {/* Color de Fondo */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-secondary uppercase tracking-wider block ml-0.5">Fondo Tienda</label>
                  <div className="flex items-center gap-2 bg-surface-hover/50 p-2 rounded-xl border border-border">
                    <input
                      type="color"
                      value={storeForm.background_color}
                      onChange={(e) => setStoreForm(prev => ({ ...prev, background_color: e.target.value }))}
                      className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0 p-0 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border-0 [&::-webkit-color-swatch]:rounded-lg"
                    />
                    <span className="text-[10px] font-mono font-bold uppercase text-primary select-all">
                      {storeForm.background_color}
                    </span>
                  </div>
                </div>

                {/* Color de Tarjeta */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-secondary uppercase tracking-wider block ml-0.5">Tarjetas / Cajas</label>
                  <div className="flex items-center gap-2 bg-surface-hover/50 p-2 rounded-xl border border-border">
                    <input
                      type="color"
                      value={storeForm.surface_color}
                      onChange={(e) => setStoreForm(prev => ({ ...prev, surface_color: e.target.value }))}
                      className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0 p-0 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border-0 [&::-webkit-color-swatch]:rounded-lg"
                    />
                    <span className="text-[10px] font-mono font-bold uppercase text-primary select-all">
                      {storeForm.surface_color}
                    </span>
                  </div>
                </div>

                {/* Color de Textos */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-secondary uppercase tracking-wider block ml-0.5">Color de Textos</label>
                  <div className="flex items-center gap-2 bg-surface-hover/50 p-2 rounded-xl border border-border">
                    <input
                      type="color"
                      value={storeForm.text_color}
                      onChange={(e) => setStoreForm(prev => ({ ...prev, text_color: e.target.value }))}
                      className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0 p-0 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border-0 [&::-webkit-color-swatch]:rounded-lg"
                    />
                    <span className="text-[10px] font-mono font-bold uppercase text-primary select-all">
                      {storeForm.text_color}
                    </span>
                  </div>
                </div>
              </div>

              {/* Vista Previa Interactiva en Tiempo Real */}
              <div className="bg-surface-hover/30 p-4 rounded-2xl border border-border/40 space-y-3">
                <label className="text-[10px] font-bold text-secondary uppercase tracking-wider block">Vista previa en tiempo real</label>
                
                {/* Contenedor del mockup */}
                <div 
                  style={{ backgroundColor: storeForm.background_color }}
                  className="p-4 rounded-xl border border-border/60 transition-all flex flex-col items-center justify-center min-h-[160px]"
                >
                  <div 
                    style={{ backgroundColor: storeForm.surface_color, borderColor: `${storeForm.primary_color}33` }}
                    className="w-full max-w-[280px] rounded-2xl p-3 border transition-all flex gap-3 shadow-md"
                  >
                    {/* Mock Image */}
                    <div className="w-16 h-16 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 flex-shrink-0">
                      <ShoppingBag size={18} style={{ color: storeForm.primary_color }} />
                    </div>

                    {/* Mock Details */}
                    <div className="flex-grow min-w-0 flex flex-col justify-between">
                      <div>
                        <div 
                          style={{ color: storeForm.text_color || getContrastColor(storeForm.surface_color) }}
                          className="text-[10px] font-bold uppercase tracking-wide truncate"
                        >
                          Producto Ejemplo
                        </div>
                        <div 
                          style={{ color: storeForm.text_color ? `${storeForm.text_color}b3` : getSecondaryTextColor(storeForm.surface_color) }}
                          className="text-[8px] line-clamp-1 leading-snug mt-0.5"
                        >
                          Descripción rápida del producto para simular.
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between mt-2 pt-1 border-t border-white/5">
                        <span 
                          style={{ color: storeForm.primary_color }}
                          className="text-[10px] font-black"
                        >
                          $1,200 CUP
                        </span>
                        
                        <button
                          type="button"
                          disabled
                          style={{ 
                            backgroundColor: storeForm.primary_color, 
                            color: getContrastColor(storeForm.primary_color)
                          }}
                          className="px-2.5 py-1 text-[8px] font-black uppercase tracking-wider rounded-lg border border-white/10 opacity-90 cursor-default"
                        >
                          + Agregar
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
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

              <div className="space-y-4 border-t border-border/40 pt-4">
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
                      value={storeForm.display_currency}
                      onChange={(e) => setStoreForm({ ...storeForm, display_currency: e.target.value as any })}
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
                        value={storeForm.usd_to_cup_rate}
                        onChange={(e) => setStoreForm({ ...storeForm, usd_to_cup_rate: Number(e.target.value) || 1.0 })}
                        icon={DollarSign}
                        helperText="Precio en CUP al que vendes el dólar. Usado cuando un producto en USD se muestra en CUP."
                      />

                      <Input
                        label="Precio de Compra del Dólar (USD en CUP)"
                        type="number"
                        step="1"
                        placeholder="Ej: 580"
                        value={storeForm.cup_to_usd_rate > 0 ? Math.round(1 / storeForm.cup_to_usd_rate) : ''}
                        onChange={(e) => {
                          const val = Number(e.target.value) || 0;
                          setStoreForm({ ...storeForm, cup_to_usd_rate: val > 0 ? 1 / val : 1.0 });
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

              <div className="space-y-4 border-t border-border/40 pt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Monto Mínimo de Compra"
                    type="number"
                    step="0.01"
                    placeholder="Ej: 1500.00"
                    value={storeForm.min_order_amount || ''}
                    onChange={(e) => setStoreForm({ ...storeForm, min_order_amount: Number(e.target.value) || 0 })}
                    icon={Coins}
                  />

                  <Select
                    label="Moneda del Monto Mínimo"
                    value={storeForm.min_order_currency}
                    onChange={(e) => setStoreForm({ ...storeForm, min_order_currency: e.target.value })}
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

            {/* Enlace Público */}
            <div className="card space-y-6">
              <div>
                <h3 className="text-sm font-bold text-primary uppercase tracking-wider flex items-center gap-2">
                  <Globe size={16} className="text-[var(--accent)]" /> Compartir en la Web
                </h3>
                <p className="text-[10px] text-secondary uppercase tracking-widest mt-1">Configuración de la tienda pública</p>
              </div>

              <div className="space-y-4 border-t border-border/40 pt-4">
                <Switch
                  label="Hacer público en la web"
                  subtitle="Permite que cualquier persona acceda al catálogo con el enlace"
                  checked={storeForm.is_public}
                  onChange={(checked) => {
                    setStoreForm(prev => {
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

                {storeForm.is_public && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                    <Input
                      label="Enlace del Catálogo (Slug)"
                      placeholder="ej: mi-tienda"
                      value={storeForm.slug}
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
                      storeForm.slug && (
                        <p className="text-[11px] text-green-500 font-medium bg-green-500/10 p-2.5 rounded-xl border border-green-500/20">
                          Tu tienda estará disponible en: <br />
                          <span className="underline font-bold select-all">{window.location.origin}/{storeForm.slug}</span>
                        </p>
                      )
                    )}
                  </div>
                )}
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

              <div className="space-y-4 border-t border-border/40 pt-4">
                <Input
                  label="Dirección Física de la Tienda"
                  placeholder="Ej: Calle Principal #123, Ciudad"
                  value={storeForm.footer_address}
                  onChange={(e) => setStoreForm({ ...storeForm, footer_address: e.target.value })}
                  icon={MapPin}
                />

                <Input
                  label="Horario de Atención"
                  placeholder="Ej: Lunes a Sábado: 9:00 AM - 6:00 PM"
                  value={storeForm.footer_schedule}
                  onChange={(e) => setStoreForm({ ...storeForm, footer_schedule: e.target.value })}
                  icon={Clock}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Teléfono de Contacto"
                    placeholder="Ej: +53 51234567"
                    value={storeForm.footer_phone}
                    onChange={(e) => setStoreForm({ ...storeForm, footer_phone: e.target.value })}
                    icon={Phone}
                  />

                  <Input
                    label="Correo Electrónico"
                    placeholder="Ej: contacto@tienda.com"
                    type="email"
                    value={storeForm.footer_email}
                    onChange={(e) => setStoreForm({ ...storeForm, footer_email: e.target.value })}
                    icon={Mail}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Usuario de Instagram"
                    placeholder="Ej: mi_tienda"
                    value={storeForm.footer_instagram}
                    onChange={(e) => setStoreForm({ ...storeForm, footer_instagram: e.target.value })}
                    icon={InstagramIcon}
                  />

                  <Input
                    label="Usuario de Facebook"
                    placeholder="Ej: mitienda.facebook"
                    value={storeForm.footer_facebook}
                    onChange={(e) => setStoreForm({ ...storeForm, footer_facebook: e.target.value })}
                    icon={FacebookIcon}
                  />
                </div>
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full py-4 font-bold" 
              loading={updateLoading || isCheckingSlug}
              icon={Save}
              size="lg"
            >
              Guardar Tienda
            </Button>
          </form>
        )}

        {/* PESTAÑA: WHATSAPP */}
        {activeTab === 'whatsapp' && (
          <div className="animate-in fade-in duration-300 space-y-4">
            <EvolutionConfig 
              catalogId={catalogId} 
              onConnected={() => {
                toast.success('¡WhatsApp Conectado!');
                checkStatus();
              }}
            />
          </div>
        )}

        {/* PESTAÑA: GRUPOS */}
        {activeTab === 'groups' && (
          <div className="animate-in fade-in duration-300 space-y-6">
            <div className="card space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-bold text-primary uppercase tracking-wider">Gestión de Grupos</h3>
                  <p className="text-[10px] text-secondary uppercase tracking-widest mt-0.5">Grupos de WhatsApp vinculados</p>
                </div>
                <Button 
                  variant="secondary" 
                  size="sm" 
                  icon={Users}
                  onClick={() => setIsLinkGroupOpen(true)}
                  className="bg-[var(--accent)]/10 text-[var(--accent)] hover:bg-[var(--accent)]/20 border-transparent text-xs"
                >
                  Vincular Grupos
                </Button>
              </div>

              {/* Presets Rápidos */}
              {linkedGroups.length > 0 && (
                <div className="bg-surface-hover/30 p-4 rounded-2xl border border-border/40 space-y-2 mt-4">
                  <label className="text-[10px] font-bold text-secondary uppercase tracking-wider block">Accesos Rápidos (Presets)</label>
                  <div className="flex items-center gap-2 flex-wrap">
                    {[1, 2, 3].map(num => {
                      const hasData = presets[num] && presets[num].length > 0;
                      return (
                        <button
                          key={num}
                          type="button"
                          onPointerDown={(e) => handlePresetPointerDown(e, num)}
                          onPointerUp={() => handlePresetPointerUp(num)}
                          onPointerCancel={() => handlePresetPointerCancel(num)}
                          onPointerLeave={() => handlePresetPointerCancel(num)}
                          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all select-none active:scale-95 border ${
                            hasData 
                              ? 'bg-[var(--accent)]/10 text-[var(--accent)] border-[var(--accent)]/30 hover:bg-[var(--accent)]/20' 
                              : 'bg-surface border-dashed border-border text-secondary hover:text-primary hover:border-white/20'
                          }`}
                        >
                          {hasData ? <Zap size={12} className="text-[var(--accent)]" /> : <ZapOff size={12} className="opacity-50" />}
                          <span>G{num}</span>
                          {hasData && (
                            <span className="ml-1 text-[9px] bg-[var(--accent)]/20 px-2 py-0.5 rounded-full font-bold">
                              {presets[num].length}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  <span className="text-[9px] text-secondary opacity-60 block mt-1">
                    * Clic para aplicar preset. Mantén presionado (1.2s) para guardar los grupos activos de hoy.
                  </span>
                </div>
              )}

              {/* Lista de Grupos */}
              {groupsLoading ? (
                <div className="space-y-3">
                  {[1, 2].map(i => (
                    <div key={i} className="flex justify-between items-center bg-surface-hover/20 p-4 rounded-xl border border-border/40">
                      <Skeleton className="h-10 w-44" />
                      <Skeleton className="h-6 w-10" />
                    </div>
                  ))}
                </div>
              ) : linkedGroups.length === 0 ? (
                <div className="p-8 text-center bg-surface-hover/10 rounded-2xl border border-dashed border-border/80">
                  <Users size={32} className="text-secondary mx-auto mb-2 opacity-50" />
                  <p className="text-xs text-primary font-bold">Sin grupos vinculados</p>
                  <p className="text-[10px] text-secondary mt-1">Vincula los grupos de WhatsApp donde deseas enviar este catálogo.</p>
                  <Button 
                    className="mt-4 px-6 text-xs bg-[var(--accent)]/15 border-transparent text-[var(--accent)] hover:bg-[var(--accent)]/25" 
                    onClick={() => setIsLinkGroupOpen(true)}
                  >
                    Vincular primer grupo
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 mt-4">
                  {linkedGroups.map(group => (
                    <GroupCard
                      key={group.id}
                      group={group}
                      onUnlink={() => setGroupUnlinkId(group.id)}
                      onToggle={toggleGroupStatus}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* PESTAÑA: AUTOMATIZACIÓN Y COLAS */}
        {activeTab === 'automation' && (
          <div className="animate-in fade-in duration-300 space-y-6">
            
            {/* Ajustes de Automatización */}
            <div className="card space-y-6">
              <div>
                <h3 className="text-sm font-bold text-primary uppercase tracking-wider flex items-center gap-2">
                  <Zap size={16} className="text-yellow-500" /> Ajustes de Automatización
                </h3>
                <p className="text-[10px] text-secondary uppercase tracking-widest mt-1">Configuración de envíos automáticos</p>
              </div>

              <div className="space-y-4 border-t border-border/40 pt-4">
                <Switch
                  label="Envío de Secuencia Diaria"
                  subtitle="Dispara todos los mensajes de secuencia a la hora fijada"
                  checked={storeForm.is_sequence_scheduled}
                  onChange={(checked) => setStoreForm({ ...storeForm, is_sequence_scheduled: checked })}
                />

                <Switch
                  label="Mensajes Individuales"
                  subtitle="Permite el envío programado de mensajes sueltos"
                  checked={storeForm.is_individual_scheduled}
                  onChange={(checked) => setStoreForm({ ...storeForm, is_individual_scheduled: checked })}
                />

                {(storeForm.is_sequence_scheduled || storeForm.is_individual_scheduled) && (
                  <div className="pt-2 animate-in fade-in slide-in-from-top-2 duration-300">
                    <Input
                      label="Hora de Inicio Diaria"
                      type="time"
                      value={storeForm.sequence_start_time}
                      onChange={(e) => setStoreForm({ ...storeForm, sequence_start_time: e.target.value })}
                      icon={Clock}
                    />
                  </div>
                )}

                <Button 
                  onClick={handleSaveAutomation} 
                  loading={updateLoading} 
                  className="w-full mt-4 font-bold"
                  size="sm"
                >
                  Guardar Horarios
                </Button>
              </div>
            </div>

            {/* Acciones Rápidas del Motor de Envío */}
            <div className="card space-y-4">
              <h3 className="text-sm font-bold text-primary uppercase tracking-wider">Acciones de Secuencia</h3>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={randomizeSequenceSchedules}
                  className="flex flex-col items-center justify-center gap-2 p-4 bg-surface-hover/20 hover:bg-surface border border-border/40 rounded-2xl text-secondary hover:text-primary transition-all active:scale-95 group text-center"
                >
                  <Clock size={20} className="text-yellow-500 group-hover:rotate-12 transition-transform" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Aleatorizar Horarios</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsRestoreConfirmOpen(true)}
                  className="flex flex-col items-center justify-center gap-2 p-4 bg-surface-hover/20 hover:bg-surface border border-border/40 rounded-2xl text-secondary hover:text-primary transition-all active:scale-95 group text-center"
                >
                  <RotateCcw size={20} className="text-blue-500 group-hover:-rotate-45 transition-transform" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Mensajes Predeterminados</span>
                </button>
              </div>
            </div>

            {/* Cola de Envíos */}
            <div className="card space-y-4">
              <div className="flex justify-between items-center border-b border-border/40 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                    <Clock size={16} className="text-orange-400" /> Cola de Envíos
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[9px] bg-orange-500/10 text-orange-400 font-bold px-2 py-0.5 rounded-full">Pendientes: {queueStats.pending}</span>
                    {queueStats.error > 0 && (
                      <span className="text-[9px] bg-red-500/10 text-red-400 font-bold px-2 py-0.5 rounded-full">Errores: {queueStats.error}</span>
                    )}
                  </div>
                </div>
                {queueItems.length > 0 && (
                  <button
                    onClick={() => setIsClearQueueConfirmOpen(true)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-red-500/20 text-red-400 hover:bg-red-500/10 active:scale-95 text-[10px] font-bold uppercase tracking-wider transition-all"
                  >
                    <Trash2 size={12} /> Limpiar Cola
                  </button>
                )}
              </div>

              {isQueueLoading ? (
                <div className="space-y-2">
                  {[1, 2].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : queueItems.length === 0 ? (
                <div className="p-8 text-center bg-surface-hover/10 rounded-2xl border border-dashed border-border/80">
                  <CheckCircle2 size={28} className="text-green-500 mx-auto mb-2" />
                  <p className="text-xs text-primary font-bold">Cola vacía</p>
                  <p className="text-[10px] text-secondary mt-1">No hay envíos pendientes programados para este catálogo.</p>
                </div>
              ) : (
                <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                  {queueItems.map((item) => (
                    <div key={item.id} className="flex justify-between items-center p-3 bg-surface-hover/20 rounded-xl border border-border/40 text-xs">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-primary truncate">{item.name || 'Mensaje de Secuencia'}</p>
                        <p className="text-[9px] text-secondary truncate mt-0.5">Destinatario: {item.recipient || 'Grupo vinculado'}</p>
                      </div>
                      <div className="text-right flex-shrink-0 ml-4">
                        <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          item.status === 'error' ? 'bg-red-500/10 text-red-400' : 'bg-orange-500/10 text-orange-400'
                        }`}>
                          {item.status === 'error' ? 'Error' : 'Pendiente'}
                        </span>
                        <p className="text-[9px] text-secondary mt-1">
                          {item.scheduled_at ? new Date(item.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Hora fijada'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

        {/* PESTAÑA: PLANTILLAS */}
        {activeTab === 'templates' && (
          <form onSubmit={handleSaveTemplates} className="space-y-6 animate-in fade-in duration-300">
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
                value={templatesForm.plantilla}
                onChange={(val) => setTemplatesForm({ ...templatesForm, plantilla: val })}
                info="Esta plantilla se usará para cada producto en el catálogo principal."
                helperText="Se envía cuando muestras los productos del catálogo."
                tagPrefix="_p"
                sectionRef={plantillaRef}
                tags={['{product_name}', '{product_description}', '{product_price}', '{product_currency}', '{catalog_name}', '{products_list}', '{contact_number}', '{store_url}']}
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
                value={templatesForm.share_template}
                onChange={(val) => setTemplatesForm({ ...templatesForm, share_template: val })}
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
                value={templatesForm.new_product_template}
                onChange={(val) => setTemplatesForm({ ...templatesForm, new_product_template: val })}
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
                value={templatesForm.out_of_stock_template}
                onChange={(val) => setTemplatesForm({ ...templatesForm, out_of_stock_template: val })}
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
                value={templatesForm.available_template}
                onChange={(val) => setTemplatesForm({ ...templatesForm, available_template: val })}
                info="Se envía para notificar que el producto vuelve a estar disponible."
                helperText="Aviso de stock disponible."
                tagPrefix="_av"
                sectionRef={availableRef}
              />

            </div>

            <Button 
              type="submit" 
              className="w-full py-4 font-bold animate-in duration-500" 
              loading={updateLoading}
              icon={Save}
              size="lg"
            >
              Guardar Plantillas
            </Button>
          </form>
        )}

        {/* PESTAÑA: HISTORIAL */}
        {activeTab === 'history' && (
          <HistoryTabContent catalogId={catalogId!} />
        )}

      </div>
      )}

      {/* MODALES REUTILIZADOS */}

      {/* Modal Vincular Grupos */}
      <LinkGroupsModal
        isOpen={isLinkGroupOpen}
        onClose={() => setIsLinkGroupOpen(false)}
        availableGroups={availableGroups}
        onFetch={fetchAvailableGroups}
        onLink={linkGroup}
        loading={groupsLoading}
      />

      {/* Confirmar Desvincular Grupo */}
      <ConfirmDialog
        isOpen={!!groupUnlinkId}
        title="Desvincular Grupo"
        message="¿Estás seguro de que deseas desvincular este grupo? No se enviarán mensajes automáticos aquí."
        onConfirm={async () => {
          if (groupUnlinkId) {
            await unlinkGroup(groupUnlinkId);
            setGroupUnlinkId(null);
            getLinkedGroups();
          }
        }}
        onClose={() => setGroupUnlinkId(null)}
      />

      {/* Confirmar Limpiar Cola */}
      <ConfirmDialog
        isOpen={isClearQueueConfirmOpen}
        title="Limpiar Cola de Envíos"
        message="¿Estás seguro de que deseas eliminar todos los mensajes pendientes y con error en la cola? Esta acción no se puede deshacer."
        confirmLabel="Limpiar Cola"
        onConfirm={handleClearQueue}
        onClose={() => setIsClearQueueConfirmOpen(false)}
        loading={isClearingQueue}
      />

      {/* Confirmar Restaurar Mensajes */}
      <ConfirmDialog
        isOpen={isRestoreConfirmOpen}
        title="Restaurar Mensajes"
        message="Esta acción eliminará todos los mensajes actuales del catálogo y restablecerá la secuencia de mensajes predeterminada. ¿Deseas continuar?"
        confirmLabel="Restaurar"
        onConfirm={restoreDefaultMessages}
        onClose={() => setIsRestoreConfirmOpen(false)}
      />

      {/* Modal Tasa de Cambio */}
      {catalog && (
        <ExchangeRatesModal
          isOpen={isExchangeRatesOpen}
          onClose={() => setIsExchangeRatesOpen(false)}
          initialUsdToCup={catalog.usd_to_cup_rate || 1.0}
          initialCupToUsd={catalog.cup_to_usd_rate || 1.0}
          onSave={updateExchangeRates}
        />
      )}

      {/* Modal Vincular con Nemu */}
      <NemuImportModal
        isOpen={isNemuImportOpen}
        onClose={() => setIsNemuImportOpen(false)}
        catalogId={catalogId!}
        onSuccess={() => loadCatalog()}
      />

    </div>
  );
};
