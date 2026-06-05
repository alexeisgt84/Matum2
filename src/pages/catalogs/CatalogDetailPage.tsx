import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { useShareStore } from '../../store/shareStore';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { 
  Package, 
  Users, 
  MessageSquare, 
  Plus, 
  Edit3, 
  Trash2, 
  Zap, 
  Clock, 
  GripVertical, 
  Settings, 
  Smartphone,
  ChevronLeft,
  Send,
  RotateCcw,
  AlertCircle,
  CheckCircle,
  ArrowUpDown,
  SortAsc,
  SortDesc,
  Search,
  PackageX,
  PackageCheck,
  Tag,
  Share2,
  ShoppingBag,
  Layout,
  X,
  ZapOff,
  Globe,
  Sparkles,
  Shield,
  UserMinus,
  Coins,
  FolderHeart
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { shareContent } from '../../lib/share';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { EmptyState } from '../../components/ui/EmptyState';
import { useProducts } from '../../hooks/useProducts';
import { useMessages } from '../../hooks/useMessages';
import { useWhatsAppGroups } from '../../hooks/useWhatsAppGroups';
import { useSendingEngine } from '../../hooks/useSendingEngine';
import { usePlanLimits } from '../../hooks/usePlanLimits';
import { ProductCard } from '../../components/products/ProductCard';
import { ProductFormModal } from '../../components/products/ProductFormModal';
import { SwipeableShareBanner } from '../../components/products/SwipeableShareBanner';
import { NemuImportModal } from '../../components/catalogs/NemuImportModal';
import { MessageCard } from '../../components/messages/MessageCard';
import { MessageFormModal } from '../../components/messages/MessageFormModal';
import { GroupCard } from '../../components/groups/GroupCard';
import { LinkGroupsModal } from '../../components/groups/LinkGroupsModal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { UpgradeModal } from '../../components/ui/UpgradeModal';
import { Modal } from '../../components/ui/Modal';
import { ExchangeRatesModal } from '../../components/catalogs/ExchangeRatesModal';
import { Switch } from '../../components/ui/Switch';
import { EvolutionConfig } from '../../components/profile/EvolutionConfig';
import { useHeader } from '../../lib/HeaderContext';
import { useCategories } from '../../hooks/useCategories';
import { ManageCategoriesModal } from '../../components/products/ManageCategoriesModal';
import { CategoryIcon } from '../../components/ui/CategoryIcon';
import { DropdownMenu, type DropdownItem } from '../../components/ui/DropdownMenu';
import { toast } from 'react-hot-toast';
import { useEvolution } from '../../hooks/useEvolution';
import type { Product } from '../../types/product';
import type { WhatsAppMessage } from '../../types/message';
import { Skeleton } from '../../components/ui/Skeleton';
import { CatalogStatusBar } from '../../components/catalogs/CatalogStatusBar';
import { ScheduleSequenceModal } from '../../components/catalogs/ScheduleSequenceModal';
import type { SequenceSchedule } from '../../types/catalog';

import { useCollaboration } from '../../hooks/useCollaboration';

type View = 'individual' | 'sequences' | 'products' | 'groups' | 'members';

export const CatalogDetailPage = () => {
  const { catalogId } = useParams();
  const navigate = useNavigate();
  const { setTitle, setSubtitle, setRightAction } = useHeader();
  const { user } = useAuthStore();
  
  const { 
    members, 
    getCatalogMembers, 
    inviteMember, 
    removeMember,
    inviteFollower 
  } = useCollaboration();

  const [searchParams, setSearchParams] = useSearchParams();
  const currentView = (searchParams.get('view') as View) || 'individual';
  
  const setView = (newView: View) => {
    setSearchParams(prev => {
      prev.set('view', newView);
      return prev;
    });
  };

  const view = currentView;
  const [catalog, setCatalog] = useState<any>(null);
  const [catLoading, setCatLoading] = useState(true);

  const isOwner = catalog ? catalog.user_id === user?.id : false;

  // Redirigir a colaboradores a la pestaña de productos por seguridad
  useEffect(() => {
    if (catalog && catalog.user_id !== user?.id && view !== 'products') {
      setView('products');
    }
  }, [catalog, user?.id, view]);

  // Cargar miembros colaboradores si es el propietario y está en la vista correspondiente
  useEffect(() => {
    if (view === 'members' && catalogId && isOwner) {
      getCatalogMembers(catalogId);
    }
  }, [view, catalogId, isOwner, getCatalogMembers]);

  // Modales
  const [isEvolutionOpen, setIsEvolutionOpen] = useState(false);

  // Hooks de Evolución (para saber si está conectado)
  const { instance } = useEvolution(catalogId);
  const hasInstance = instance?.status === 'connected';

  // Redirigir si la vista activa es 'sequences' pero no hay conexión
  useEffect(() => {
    if (view === 'sequences' && !hasInstance) {
      setView('individual');
    }
  }, [view, hasInstance]);

  // Estados de Búsqueda y Ordenación
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortField, setSortField] = useState('position');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | string | null>(null);
  const [isCategoriesModalOpen, setIsCategoriesModalOpen] = useState(false);

  // Debounce para la búsqueda
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Hook de Categorías
  const { categories, getCategories } = useCategories(catalogId);

  // Hooks de Producto
  const { products, loading: prodLoading, hasMore, loadMore, getProducts, saveProduct, deleteProduct, updateProductsOrder } = useProducts(catalogId, debouncedSearch, sortField, sortOrder, selectedCategoryId);
  
  // Hooks de Mensaje
  const { messages, loading: msgLoading, getMessages, saveMessage, deleteMessage, updateMessagesOrder, toggleMessageSequence } = useMessages(catalogId);
  
  // Hooks de Grupos (Seguimos usándolos para el modal de grupos)
  const { linkedGroups, availableGroups, loading: groupsLoading, getLinkedGroups, fetchAvailableGroups, linkGroup, unlinkGroup, toggleGroupStatus, applyGroupPreset } = useWhatsAppGroups(catalogId);


  // Motor de Envío
  const { sendCatalogToGroups, sendSingleMessage, sendSingleProduct, sendProductOutOfStock, sendProductAvailable, sendingIds } = useSendingEngine(catalogId);

  const { counts, limits, canAddProduct, refresh: refreshLimits } = usePlanLimits();

  // Estados de Modales
  const { sharedContentList, removeSharedContent } = useShareStore();
  const [prefillIndex, setPrefillIndex] = useState<number | null>(null);
  const [isProdFormOpen, setIsProdFormOpen] = useState(false);
  const [isExchangeRatesOpen, setIsExchangeRatesOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  const [productToAgotado, setProductToAgotado] = useState<Product | null>(null);
  const [productToAvailable, setProductToAvailable] = useState<Product | null>(null);
  const [isAgotadoLoading, setIsAgotadoLoading] = useState(false);

  const [isMsgFormOpen, setIsMsgFormOpen] = useState(false);
  const [editingMessage, setEditingMessage] = useState<WhatsAppMessage | null>(null);
  const [messageToDelete, setMessageToDelete] = useState<string | null>(null);

  const [isClearQueueConfirmOpen, setIsClearQueueConfirmOpen] = useState(false);
  const [isClearingQueue, setIsClearingQueue] = useState(false);

  const [isLinkGroupOpen, setIsLinkGroupOpen] = useState(false);
  const [groupUnlinkId, setGroupUnlinkId] = useState<string | null>(null);

  // Estados y refs para accesos rápidos (Presets de grupos)
  const [presets, setPresets] = useState<Record<number, string[]>>({
    1: [],
    2: [],
    3: []
  });
  const presetTimeoutRef = useRef<Record<number, any>>({});
  const isLongPressRef = useRef<Record<number, boolean>>({});

  // Cargar presets de localStorage
  useEffect(() => {
    if (catalogId) {
      const loadedPresets: Record<number, string[]> = { 1: [], 2: [], 3: [] };
      for (let i = 1; i <= 3; i++) {
        try {
          const data = localStorage.getItem(`matum_group_preset_${catalogId}_${i}`);
          if (data) {
            loadedPresets[i] = JSON.parse(data);
          }
        } catch (e) {
          console.error(e);
        }
      }
      setPresets(loadedPresets);
    }
  }, [catalogId]);

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
      if (navigator.vibrate) {
        navigator.vibrate(100);
      }
      presetTimeoutRef.current[presetNum] = null;
    }, 1200);
  };

  const handlePresetPointerUp = (e: React.PointerEvent, presetNum: number) => {
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

  // Estados y refs para compartir catálogo (Discreto)
  const shareTimeoutRef = useRef<any>(null);
  const isShareLongPressRef = useRef(false);

  const handleShareCatalog = async () => {
    if (!catalog?.follow_code) return;
    const shareText = `Código de enlace al catálogo "${catalog.name}": ${catalog.follow_code}`;
    await shareContent({
      text: shareText
    });
  };

  const handleSharePointerDown = (e: React.PointerEvent) => {
    isShareLongPressRef.current = false;
    if (shareTimeoutRef.current) {
      clearTimeout(shareTimeoutRef.current);
    }
    shareTimeoutRef.current = setTimeout(() => {
      isShareLongPressRef.current = true;
      if (catalog?.follow_code) {
        navigator.clipboard.writeText(catalog.follow_code)
          .then(() => {
            toast.success('¡Código copiado al portapapeles!');
            if (navigator.vibrate) {
              navigator.vibrate(80);
            }
          })
          .catch((err) => {
            console.error('Error al copiar:', err);
          });
      }
      shareTimeoutRef.current = null;
    }, 800);
  };

  const handleSharePointerUp = (e: React.PointerEvent) => {
    if (shareTimeoutRef.current) {
      clearTimeout(shareTimeoutRef.current);
      shareTimeoutRef.current = null;
    }
    if (!isShareLongPressRef.current) {
      handleShareCatalog();
    }
  };

  const handleSharePointerCancel = () => {
    if (shareTimeoutRef.current) {
      clearTimeout(shareTimeoutRef.current);
      shareTimeoutRef.current = null;
    }
  };

  const [showUpgrade, setShowUpgrade] = useState(false);
  const [isRestoreOpen, setIsRestoreOpen] = useState(false);
  const [isNemuImportOpen, setIsNemuImportOpen] = useState(false);
  
  const [statsLoading, setStatsLoading] = useState(false);
  const [queueStats, setQueueStats] = useState({ pending: 0, sent: 0, error: 0 });
  const [tempTime, setTempTime] = useState('');
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isQueueModalOpen, setIsQueueModalOpen] = useState(false);
  const [queueItems, setQueueItems] = useState<any[]>([]);
  const [isQueueLoading, setIsQueueLoading] = useState(false);

  
  // Estados de Selección
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [selectedMessageIds, setSelectedMessageIds] = useState<string[]>([]);
  const [isBulkDeleteConfirmOpen, setIsBulkDeleteConfirmOpen] = useState(false);
  
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hasMore || prodLoading || view !== 'products') return;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        loadMore();
      }
    }, { threshold: 0.1 });

    if (sentinelRef.current) {
      observer.observe(sentinelRef.current);
    }

    return () => observer.disconnect();
  }, [hasMore, prodLoading, loadMore, view]);

  useEffect(() => {
    if (catalog?.sequence_start_time) {
      setTempTime(catalog.sequence_start_time);
    }
  }, [catalog?.sequence_start_time]);

  useEffect(() => {
    loadCatalog();
    getProducts(true);
    getMessages();
    getLinkedGroups();
    getCategories();
  }, [catalogId, getMessages, getLinkedGroups, debouncedSearch, sortField, sortOrder, selectedCategoryId, getCategories]);


  const [isEnsuringCatalog, setIsEnsuringCatalog] = useState(false);

  // Asegurar que existe el item de catálogo en la secuencia
  useEffect(() => {
    if (catalogId && !msgLoading && !isEnsuringCatalog) {
      const hasCatalogItem = messages.some(m => m.type === 'catalog_products');
      if (!hasCatalogItem) {
        const createCatalogItem = async () => {
          setIsEnsuringCatalog(true);
          try {
            await supabase.from('whatsapp_messages').insert([{
              catalog_id: catalogId,
              name: 'Catálogo',
              content: 'Productos del catálogo',
              type: 'catalog_products',
              is_sequence: true,
              is_individual: false,
              sequence_order: messages.length
            }]);
            await getMessages();
          } finally {
            setIsEnsuringCatalog(false);
          }
        };
        createCatalogItem();
      }
    }
  }, [catalogId, messages, msgLoading, getMessages, isEnsuringCatalog]);

  // Configurar el Header
  useEffect(() => {
    let interval: any;
    if (queueStats.pending > 0 || queueStats.error > 0) {
      interval = setInterval(fetchQueueStats, 30000); // Cada 30 seg si hay cola
    } else {
      interval = setInterval(fetchQueueStats, 120000); // Cada 2 min si no hay
    }
    return () => clearInterval(interval);
  }, [catalogId, queueStats.pending, queueStats.error]);

  useEffect(() => {
    if (catalog) {
      setTitle(catalog.name);
      setSubtitle('Gestión de Contenido');
      
      const optionsItems: DropdownItem[] = [];

      if (catalog.is_public && catalog.slug) {
        optionsItems.push({ 
          label: 'Ver Catálogo Web', 
          icon: Globe, 
          onClick: () => window.open(`/${catalog.slug}`, '_blank') 
        });
      } else if (isOwner) {
        optionsItems.push({ 
          label: 'Publicar en la Web', 
          icon: Globe, 
          onClick: () => navigate(`/catalogs/${catalogId}/settings?tab=store`) 
        });
      }

      if (isOwner) {
        optionsItems.push(
          { 
            label: 'Ajustes de Tienda', 
            icon: Settings, 
            onClick: () => navigate(`/catalogs/${catalogId}/settings?tab=store`) 
          },
          { 
            label: 'Tasa de Cambio', 
            icon: Coins, 
            onClick: () => setIsExchangeRatesOpen(true) 
          },
          { 
            label: 'Configurar Plantillas', 
            icon: Layout, 
            onClick: () => navigate(`/catalogs/${catalogId}/settings?tab=templates`) 
          },
          { 
            label: 'Conectar WhatsApp', 
            icon: Smartphone, 
            onClick: () => navigate(`/catalogs/${catalogId}/settings?tab=whatsapp`) 
          }
        );

        if (hasInstance) {
          optionsItems.push(
            { 
              label: 'Grupos Vinculados', 
              icon: Users, 
              onClick: () => navigate(`/catalogs/${catalogId}/settings?tab=groups`) 
            },
            { 
              label: 'Automatización y Colas', 
              icon: Zap, 
              onClick: () => navigate(`/catalogs/${catalogId}/settings?tab=automation`) 
            }
          );
        }

        optionsItems.push(
          { 
            label: 'Vincular con Nemu', 
            icon: ShoppingBag, 
            onClick: () => setIsNemuImportOpen(true) 
          }
        );
      }

      const StatBadge = ({ icon: Icon, value, color, onClick, title }: { icon: any, value: number, color: string, onClick?: () => void, title?: string }) => (
        <div 
          onClick={onClick}
          title={title}
          className={`flex items-center gap-1 px-2 py-1 rounded-md bg-white/5 border border-white/5 ${(onClick && isOwner) ? 'cursor-pointer hover:bg-white/10 active:scale-95 transition-all' : ''}`}
        >
          <Icon size={12} className={color} />
          <span className="text-[10px] font-bold text-gray-300 tabular-nums">{value}</span>
        </div>
      );

      setRightAction(
        <div className="flex items-center gap-2">
          {/* Mini Stats discreet */}
          <div className="hidden sm:flex items-center gap-1.5 mr-2">
            <StatBadge icon={MessageSquare} value={messages.length} color="text-blue-400" />
            {hasInstance && <StatBadge icon={Zap} value={messages.filter(m => m.is_sequence).length} color="text-yellow-400" />}
            <StatBadge icon={Package} value={products.length} color="text-purple-400" />
            <StatBadge icon={Users} value={linkedGroups.filter(g => g.is_active).length} color="text-[var(--accent)]" />
            {queueStats.pending > 0 && (
              <StatBadge 
                icon={Clock} 
                value={queueStats.pending} 
                color="text-orange-400 animate-pulse" 
                onClick={isOwner ? () => setIsQueueModalOpen(true) : undefined}
                title="Ver cola de envío"
              />
            )}
            {queueStats.error > 0 && (
              <StatBadge 
                icon={AlertCircle} 
                value={queueStats.error} 
                color="text-red-400" 
                onClick={isOwner ? () => setIsQueueModalOpen(true) : undefined}
                title="Ver cola de envío"
              />
            )}
          </div>

          {optionsItems.length > 0 && (
            <DropdownMenu 
              items={optionsItems} 
              trigger={
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors border border-white/5 text-gray-400 hover:text-white">
                  <Settings size={18} />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Opciones</span>
                </button>
              }
            />
          )}
        </div>
      );
    }

    return () => {
      setTitle(null);
      setSubtitle(null);
      setRightAction(null);
    };
  }, [catalog, catalogId, navigate, setTitle, setSubtitle, setRightAction, instance?.status, messages.length, products.length, linkedGroups, queueStats, setIsQueueModalOpen]);

  const loadCatalog = async () => {
    setCatLoading(true);
    const { data } = await supabase
      .from('catalogs')
      .select('*')
      .eq('id', catalogId)
      .single();
    
    if (data) setCatalog(data);
    setCatLoading(false);
    fetchQueueStats();
  };

  const fetchQueueStats = async () => {
    if (!catalogId) return;
    setStatsLoading(true);
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
    } finally {
      setStatsLoading(false);
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
      setCatalog({ 
        ...catalog, 
        usd_to_cup_rate: usdToCup,
        cup_to_usd_rate: cupToUsd
      });
      toast.success('Tasas de cambio actualizadas');
    } catch (err: any) {
      toast.error('Error al actualizar tasas de cambio');
      throw err;
    }
  };

  const updateSequenceStartTime = async (time: string) => {
    if (!catalogId) return;
    try {
      const { error } = await supabase
        .from('catalogs')
        .update({ sequence_start_time: time })
        .eq('id', catalogId);
      
      if (error) throw error;
      setCatalog({ ...catalog, sequence_start_time: time });
      toast.success('Horario de inicio actualizado');
    } catch (err: any) {
      toast.error('Error al actualizar horario');
    }
  };

  const updateSequenceScheduled = async (scheduled: boolean) => {
    if (!catalogId) return;
    try {
      const { error } = await supabase
        .from('catalogs')
        .update({ is_sequence_scheduled: scheduled })
        .eq('id', catalogId);
      
      if (error) throw error;
      setCatalog({ ...catalog, is_sequence_scheduled: scheduled });
      toast.success(scheduled ? 'Programación activada' : 'Programación desactivada');
      
      // Al desactivar, cancelar automáticamente todos los mensajes pendientes en la cola
      if (!scheduled) {
        const { error: clearError } = await supabase
          .from('wa_message_queue')
          .update({ status: 'cancelled', updated_at: new Date().toISOString() })
          .eq('catalog_id', catalogId)
          .eq('status', 'pending');
        
        if (clearError) {
          console.error('Error al cancelar cola:', clearError);
        } else if (queueStats.pending > 0) {
          toast.success(`${queueStats.pending} mensajes pendientes cancelados`);
        }
        fetchQueueStats();
      }
    } catch (err: any) {
      toast.error('Error al actualizar programación');
    }
  };

  const handleSaveSchedules = async (schedules: SequenceSchedule[]) => {
    if (!catalogId) return;
    try {
      const { error } = await supabase
        .from('catalogs')
        .update({ sequence_schedules: schedules })
        .eq('id', catalogId);
      
      if (error) throw error;
      setCatalog({ ...catalog, sequence_schedules: schedules });
      toast.success('Horarios de secuencia actualizados');
    } catch (err: any) {
      toast.error('Error al guardar horarios');
      throw err;
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
      fetchQueueStats();
      setIsClearQueueConfirmOpen(false);
    } catch (err: any) {
      toast.error('Error al limpiar cola: ' + err.message, { id: toastId });
    } finally {
      setIsClearingQueue(false);
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
        .limit(50);
      
      if (error) throw error;
      setQueueItems(data || []);
    } catch (err: any) {
      toast.error('Error al cargar la cola: ' + err.message);
    } finally {
      setIsQueueLoading(false);
    }
  };

  useEffect(() => {
    if (isQueueModalOpen) {
      fetchQueueItems();
    }
  }, [isQueueModalOpen, catalogId]);

  const onDragEnd = (result: any) => {
    if (!result.destination) return;

    if (result.source.droppableId === 'products-list') {
      const items = Array.from(products);
      const [reorderedItem] = items.splice(result.source.index, 1);
      items.splice(result.destination.index, 0, reorderedItem);
      updateProductsOrder(items);
      return;
    }

    const isSequence = result.source.droppableId === 'sequence-messages';
    const targetMessages = isSequence ? messages.filter(m => m.is_sequence) : messages;
    
    const items = Array.from(targetMessages);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    updateMessagesOrder(items);
  };

  const onUnlinkGroup = async (id: string) => {
    await unlinkGroup(id);
  };

  const randomizeSequenceSchedules = async () => {
    if (!catalogId || !catalog?.sequence_start_time) {
      toast.error('Establece un horario de inicio primero');
      return;
    }
    
    const sequenceMessages = [...messages].filter(m => m.is_sequence).sort((a, b) => a.sequence_order - b.sequence_order);
    if (sequenceMessages.length === 0) {
      toast.error('No hay mensajes en la secuencia');
      return;
    }

    const baseTime = catalog.sequence_start_time;
    const [hours, minutes] = baseTime.split(':').map(Number);
    
    let currentTime = new Date();
    currentTime.setHours(hours, minutes, 0, 0);

    const updates = sequenceMessages.map((msg, index) => {
      // Usar a misma base o añadir minutos por orden de secuencia si conviene
      if (index > 0) {
        currentTime.setMinutes(currentTime.getMinutes() + 1); // al menos 1 min entre mensajes de secuencia
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

    try {
      const { error } = await supabase.from('whatsapp_messages').upsert(updates);
      if (error) throw error;
      toast.success('Horarios aleatorios generados');
      getMessages();
    } catch (err: any) {
      toast.error('Error al generar horarios: ' + err.message);
    }
  };

  const restoreDefaultMessages = async () => {
    if (!catalogId || !catalog) return;
    
    setCatLoading(true);
    try {
      // 1. Eliminar todos los mensajes del catálogo
      const { error: delError } = await supabase
        .from('whatsapp_messages')
        .delete()
        .eq('catalog_id', catalogId);
      
      if (delError) throw delError;

      // 2. Mensajes predeterminados
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

      toast.success('Mensajes restaurados con éxito');
      await getMessages();
    } catch (err: any) {
      toast.error('Error al restaurar: ' + err.message);
    } finally {
      setCatLoading(false);
      setIsRestoreOpen(false);
    }
  };

  // Handlers de Selección
  const toggleSelectProduct = (id: string) => {
    setSelectedProductIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectMessage = (id: string) => {
    setSelectedMessageIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const clearSelection = () => {
    setSelectedProductIds([]);
    setSelectedMessageIds([]);
  };

  const selectAllVisible = () => {
    if (view === 'products') {
      setSelectedProductIds(products.map(p => p.id));
    } else if (view === 'individual' || view === 'sequences') {
      const targetMessages = view === 'sequences' ? messages.filter(m => m.is_sequence) : messages;
      setSelectedMessageIds(targetMessages.map(m => m.id));
    }
  };

  const handleUnlinkProduct = async (p: Product) => {
    const confirm = window.confirm(`¿Estás seguro de que deseas desvincular el producto "${p.name}" de su catálogo origen? Ya no se sincronizará automáticamente.`);
    if (!confirm) return;

    const toastId = toast.loading('Desvinculando producto…');
    try {
      const { error } = await supabase
        .from('products')
        .update({
          parent_product_id: null,
          base_price: null,
          is_discontinued: false
        })
        .eq('id', p.id);

      if (error) throw error;
      toast.success('Producto desvinculado con éxito', { id: toastId });
      getProducts(true);
    } catch (err: any) {
      toast.error('Error al desvincular: ' + err.message, { id: toastId });
    }
  };

  const handleToggleProductActive = async (p: Product) => {
    const nextState = !p.is_active;
    const toastId = toast.loading(nextState ? 'Mostrando producto…' : 'Ocultando producto…');
    try {
      const { error } = await supabase
        .from('products')
        .update({ is_active: nextState })
        .eq('id', p.id);

      if (error) throw error;
      toast.success(nextState ? 'Producto visible al público' : 'Producto oculto al público', { id: toastId });
      getProducts(true);
    } catch (err: any) {
      toast.error('Error al cambiar visibilidad: ' + err.message, { id: toastId });
    }
  };

  // Acciones Masivas
  const handleBulkDeleteInitiate = () => {
    const total = selectedProductIds.length + selectedMessageIds.length;
    if (total > 0) {
      setIsBulkDeleteConfirmOpen(true);
    }
  };

  const executeBulkDelete = async () => {
    const total = selectedProductIds.length + selectedMessageIds.length;
    const toastId = toast.loading('Eliminando ítems…');
    try {
      if (selectedProductIds.length > 0) {
        const { error } = await supabase.from('products').delete().in('id', selectedProductIds);
        if (error) throw error;
      }
      if (selectedMessageIds.length > 0) {
        const { error } = await supabase.from('whatsapp_messages').delete().in('id', selectedMessageIds);
        if (error) throw error;
      }
      toast.success('Ítems eliminados', { id: toastId });
      getProducts(true);
      getMessages();
      clearSelection();
      setIsBulkDeleteConfirmOpen(false);
    } catch (err: any) {
      toast.error('Error al eliminar: ' + err.message, { id: toastId });
    }
  };

  const handleBulkSend = async () => {
    const total = selectedProductIds.length + selectedMessageIds.length;
    if (total === 0) return;

    const toastId = toast.loading(`Iniciando envío de ${total} ítems…`);
    try {
      // Enviar productos
      for (const id of selectedProductIds) {
        const product = products.find(p => p.id === id);
        if (product) {
          await sendSingleProduct(product);
        }
      }
      // Enviar mensajes
      for (const id of selectedMessageIds) {
        const message = messages.find(m => m.id === id);
        if (message) {
          await sendSingleMessage(message);
        }
      }
      toast.success('Envíos completados', { id: toastId });
      clearSelection();
    } catch (err: any) {
      toast.error('Error durante el envío masivo', { id: toastId });
    }
  };

  const handleBulkShare = async () => {
    let text = '';
    const imageUrls: string[] = [];
    
    selectedProductIds.forEach(id => {
      const p = products.find(prod => prod.id === id);
      if (p) {
        if (p.imagen_url) imageUrls.push(p.imagen_url);
        text += `🛍️ *${p.name}*\n${p.price} ${p.currency}\n${p.description || ''}\n\n`;
      }
    });

    selectedMessageIds.forEach(id => {
      const m = messages.find(msg => msg.id === id);
      if (m) {
        if (m.image_url) imageUrls.push(m.image_url);
        text += `💬 *${m.name}*\n${m.content || ''}\n\n`;
      }
    });

    if (!text) return;

    await shareContent({
      title: 'Selección de Catálogo',
      text: text.trim(),
      imageUrls: imageUrls
    });
  };

  const handleBulkSequence = async () => {
    if (selectedMessageIds.length === 0) {
      toast.error('Selecciona mensajes para agregar a la secuencia');
      return;
    }

    const toastId = toast.loading('Actualizando secuencia…');
    try {
      const { error } = await supabase
        .from('whatsapp_messages')
        .update({ is_sequence: true })
        .in('id', selectedMessageIds);

      if (error) throw error;
      toast.success(`${selectedMessageIds.length} mensajes agregados a la secuencia`, { id: toastId });
      getMessages();
      clearSelection();
    } catch (err: any) {
      toast.error('Error al actualizar: ' + err.message, { id: toastId });
    }
  };

  const handleBulkStockStatus = async (status: 'out_of_stock' | 'available') => {
    if (selectedProductIds.length === 0) return;
    
    const isOutOfStock = status === 'out_of_stock';
    const toastId = toast.loading(`Marcando ${selectedProductIds.length} productos como ${isOutOfStock ? 'agotados' : 'disponibles'}…`);
    
    try {
      const { error } = await supabase
        .from('products')
        .update({ 
          is_out_of_stock: isOutOfStock, 
          stock_status: status 
        })
        .in('id', selectedProductIds);

      if (error) throw error;
      
      toast.success(`${selectedProductIds.length} productos actualizados`, { id: toastId });
      getProducts(true);
      clearSelection();
    } catch (err: any) {
      toast.error('Error al actualizar productos: ' + err.message, { id: toastId });
    }
  };

  const handleAddAction = () => {
    if (view === 'products') {
      if (canAddProduct) {
        setEditingProduct(null);
        setIsProdFormOpen(true);
      } else {
        setShowUpgrade(true);
      }
    } else if (view === 'groups') {
      setIsLinkGroupOpen(true);
    } else {
      setEditingMessage(null);
      setIsMsgFormOpen(true);
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
            <Skeleton className="h-9 w-24" />
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

  return (
    <div className="flex flex-col h-[calc(100vh-9rem)] max-w-lg mx-auto w-full">
      {/* Barra de compartir catálogo (Ancho completo debajo del header) */}
      {catalog?.follow_code && (
        <div 
          onPointerDown={handleSharePointerDown}
          onPointerUp={handleSharePointerUp}
          onPointerCancel={handleSharePointerCancel}
          className="w-full flex items-center justify-between px-4 py-2.5 bg-surface/50 border-b border-border/80 text-[11px] text-secondary select-none active:bg-surface-hover/50 cursor-pointer transition-colors"
          title="Click para compartir, mantener presionado para copiar"
        >
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-accent/60 flex-shrink-0 animate-pulse" />
            <span>Compartir catálogo:</span>
            <span className="font-mono font-bold text-primary tracking-wider">{catalog.follow_code}</span>
          </div>
          <div className="flex items-center gap-1 text-[10px] font-bold text-accent uppercase tracking-wider">
            <Share2 size={12} className="text-accent/80" />
            <span className="hidden sm:inline">Compartir</span>
          </div>
        </div>
      )}

      {/* Selector de Vistas / Barra de Selección */}
      <div className="px-4 py-6 bg-gradient-to-b from-surface to-background border-b border-border w-full">
        {(selectedProductIds.length > 0 || selectedMessageIds.length > 0) ? (
          /* Barra de Selección Masiva (Integrada) */
          <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-accent text-black flex items-center justify-center font-bold text-xs shadow-lg shadow-accent/20 tabular-nums">
                  {selectedProductIds.length + selectedMessageIds.length}
                </div>
                <div>
                  <p className="text-primary text-[10px] font-bold uppercase tracking-[0.2em]">Seleccionados</p>
                  <p className="text-secondary text-[9px] uppercase font-bold opacity-60">Acciones masivas</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={selectAllVisible}
                  className="text-[9px] bg-surface-hover hover:bg-surface text-secondary hover:text-primary px-3 py-1.5 rounded-xl border border-border transition-all font-bold uppercase tracking-wider"
                >
                  Todos
                </button>
                <button 
                  onClick={clearSelection}
                  className="p-2 bg-surface-hover hover:bg-surface text-secondary hover:text-red-500 rounded-xl border border-border transition-all"
                  title="Salir de selección"
                  aria-label="Cerrar modo de selección"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              <button 
                onClick={handleBulkSend}
                className="flex flex-col items-center justify-center gap-1 py-2.5 rounded-2xl bg-surface-hover hover:bg-accent/10 text-secondary hover:text-accent border border-border hover:border-accent/20 transition-all group"
              >
                <Send size={16} className="group-hover:scale-110 transition-transform" />
                <span className="text-[8px] font-bold uppercase tracking-widest">Enviar</span>
              </button>

              <button 
                onClick={handleBulkDeleteInitiate}
                className="flex flex-col items-center justify-center gap-1 py-2.5 rounded-2xl bg-surface-hover hover:bg-red-500/10 text-secondary hover:text-red-500 border border-border hover:border-red-500/20 transition-all group"
              >
                <Trash2 size={16} className="group-hover:scale-110 transition-transform" />
                <span className="text-[8px] font-bold uppercase tracking-widest">Borrar</span>
              </button>

              <button 
                onClick={handleBulkShare}
                className="flex flex-col items-center justify-center gap-1 py-2.5 rounded-2xl bg-surface-hover hover:bg-blue-500/10 text-secondary hover:text-blue-500 border border-border hover:border-blue-500/20 transition-all group"
              >
                <Share2 size={16} className="group-hover:scale-110 transition-transform" />
                <span className="text-[8px] font-bold uppercase tracking-widest">Compartir</span>
              </button>

              {selectedMessageIds.length > 0 && hasInstance && (
                <button 
                  onClick={handleBulkSequence}
                  className="flex flex-col items-center justify-center gap-1 py-2.5 rounded-2xl bg-surface-hover hover:bg-yellow-500/10 text-secondary hover:text-yellow-400 border border-border hover:border-yellow-500/20 transition-all group"
                >
                  <Zap size={16} className="group-hover:scale-110 transition-transform" />
                  <span className="text-[8px] font-bold uppercase tracking-widest">Secuencia</span>
                </button>
              )}

              {selectedProductIds.length > 0 && (
                <>
                  <button 
                    onClick={() => handleBulkStockStatus('out_of_stock')}
                    className="flex flex-col items-center justify-center gap-1 py-2.5 rounded-2xl bg-surface-hover hover:bg-orange-500/10 text-secondary hover:text-orange-500 border border-border hover:border-orange-500/20 transition-all group"
                  >
                    <PackageX size={16} className="group-hover:scale-110 transition-transform" />
                    <span className="text-[8px] font-bold uppercase tracking-widest">Agotados</span>
                  </button>

                  <button 
                    onClick={() => handleBulkStockStatus('available')}
                    className="flex flex-col items-center justify-center gap-1 py-2.5 rounded-2xl bg-surface-hover hover:bg-green-500/10 text-secondary hover:text-green-500 border border-border hover:border-green-500/20 transition-all group"
                  >
                    <PackageCheck size={16} className="group-hover:scale-110 transition-transform" />
                    <span className="text-[8px] font-bold uppercase tracking-widest">Disponible</span>
                  </button>
                </>
              )}
            </div>
          </div>
        ) : isOwner ? (
          /* Switch Moderno Adaptativo (Cuádruple o Triple) */
          <div className="relative flex p-1.5 bg-surface-hover rounded-2xl border border-border backdrop-blur-sm">
            <button
              onClick={() => setView('individual')}
              className={`relative z-10 flex-1 flex flex-col items-center justify-center gap-1 py-3 rounded-xl transition-all duration-300 min-w-0 ${
                view === 'individual' ? 'text-accent' : 'text-secondary hover:text-primary'
              }`}
            >
              <MessageSquare size={18} className={view === 'individual' ? 'animate-pulse' : ''} />
              <span className="font-bold text-[9px] sm:text-[10px] uppercase tracking-wider text-center truncate w-full px-1">Mensajes</span>
            </button>
            
            <button
              onClick={() => setView('products')}
              className={`relative z-10 flex-1 flex flex-col items-center justify-center gap-1 py-3 rounded-xl transition-all duration-300 min-w-0 ${
                view === 'products' ? 'text-accent' : 'text-secondary hover:text-primary'
              }`}
            >
              <Package size={18} className={view === 'products' ? 'animate-pulse' : ''} />
              <span className="font-bold text-[9px] sm:text-[10px] uppercase tracking-wider text-center truncate w-full px-1">Productos</span>
            </button>

            {hasInstance && (
              <button
                onClick={() => setView('sequences')}
                className={`relative z-10 flex-1 flex flex-col items-center justify-center gap-1 py-3 rounded-xl transition-all duration-300 min-w-0 ${
                  view === 'sequences' ? 'text-accent' : 'text-secondary hover:text-primary'
                }`}
              >
                <Zap size={18} className={view === 'sequences' ? 'animate-pulse' : ''} />
                <span className="font-bold text-[9px] sm:text-[10px] uppercase tracking-wider text-center truncate w-full px-1">Secuencia</span>
              </button>
            )}

            <button
              onClick={() => setView('members')}
              className={`relative z-10 flex-1 flex flex-col items-center justify-center gap-1 py-3 rounded-xl transition-all duration-300 min-w-0 ${
                view === 'members' ? 'text-accent' : 'text-secondary hover:text-primary'
              }`}
            >
              <Users size={18} className={view === 'members' ? 'animate-pulse' : ''} />
              <span className="font-bold text-[9px] sm:text-[10px] uppercase tracking-wider text-center truncate w-full px-1">Miembros</span>
            </button>

            {/* Indicador Deslizante Adaptativo */}
            <div 
              className="absolute top-1.5 bottom-1.5 left-1.5 transition-all duration-500 ease-out bg-primary/10 rounded-xl border border-primary/10 shadow-lg shadow-accent/10"
              style={{ 
                width: hasInstance ? 'calc((100% - 16px) / 4)' : 'calc((100% - 12px) / 3)',
                transform: hasInstance
                  ? `translateX(${view === 'individual' ? '0%' : view === 'products' ? '100%' : view === 'sequences' ? '200%' : view === 'members' ? '300%' : '0%'})`
                  : `translateX(${view === 'individual' ? '0%' : view === 'products' ? '100%' : view === 'members' ? '200%' : '0%'})`
              }}
            />
          </div>
        ) : (
          /* Vista simple para colaboradores */
          <div className="flex items-center justify-between px-3 py-3 border border-border bg-surface-hover rounded-2xl">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary flex items-center gap-2">
              <Package size={14} className="text-accent" />
              Gestión de Productos (Colaboración)
            </span>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-2 sm:px-4 py-4 pb-32">
        {view === 'products' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* Buscador y Ordenación */}
            <div className="flex items-center gap-2 mb-4 flex-1">
              <Input
                type="text"
                placeholder="Buscar por nombre, descripción o precio…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                icon={Search}
                className="!h-12 py-0"
              />
              
              <DropdownMenu
                trigger={
                  <button className="flex-shrink-0 w-12 h-12 flex items-center justify-center bg-surface-hover border border-border rounded-xl hover:bg-surface transition-colors" title="Ordenar">
                    <ArrowUpDown size={18} className="text-accent" />
                  </button>
                }
                items={[
                  {
                    label: 'Orden manual',
                    icon: GripVertical,
                    onClick: () => { setSortField('position'); setSortOrder('asc'); }
                  },
                  {
                    label: 'Nombre (A-Z)',
                    icon: SortAsc,
                    onClick: () => { setSortField('name'); setSortOrder('asc'); }
                  },
                  {
                    label: 'Nombre (Z-A)',
                    icon: SortDesc,
                    onClick: () => { setSortField('name'); setSortOrder('desc'); }
                  },
                  {
                    label: 'Precio: Menor a Mayor',
                    icon: SortAsc,
                    onClick: () => { setSortField('price'); setSortOrder('asc'); }
                  },
                  {
                    label: 'Precio: Mayor a Menor',
                    icon: SortDesc,
                    onClick: () => { setSortField('price'); setSortOrder('desc'); }
                  }
                ]}
              />
            </div>

            {/* Chips de Categorías */}
            <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2 scrollbar-none select-none">
              <button
                onClick={() => setSelectedCategoryId(null)}
                className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-bold transition-all border ${
                  selectedCategoryId === null
                    ? 'bg-[var(--accent)]/10 border-[var(--accent)] text-[var(--accent)]'
                    : 'bg-surface-hover border-border text-secondary hover:text-primary hover:border-white/20'
                }`}
              >
                Todos
              </button>
              
              <button
                onClick={() => setSelectedCategoryId('none')}
                className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-bold transition-all border ${
                  selectedCategoryId === 'none'
                    ? 'bg-[var(--accent)]/10 border-[var(--accent)] text-[var(--accent)]'
                    : 'bg-surface-hover border-border text-secondary hover:text-primary hover:border-white/20'
                }`}
              >
                Sin categoría
              </button>

              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategoryId(cat.id)}
                  className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-bold transition-all border flex items-center gap-1.5 ${
                    selectedCategoryId === cat.id
                      ? 'bg-[var(--accent)]/10 border-[var(--accent)] text-[var(--accent)]'
                      : 'bg-surface-hover border-border text-secondary hover:text-primary hover:border-white/20'
                  }`}
                >
                  <CategoryIcon name={cat.icon} size={14} />
                  <span>{cat.name}</span>
                </button>
              ))}

              <button
                onClick={() => setIsCategoriesModalOpen(true)}
                className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-surface-hover border border-dashed border-border rounded-full hover:bg-surface text-secondary hover:text-primary transition-all ml-1 cursor-pointer"
                title="Gestionar Categorías"
              >
                <FolderHeart size={14} />
              </button>
            </div>

            {sharedContentList.length > 0 && (
              <div className="mb-4 space-y-1">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-secondary px-1 mb-1 flex justify-between items-center">
                  <span>Productos en espera ({sharedContentList.length})</span>
                  <span className="text-[8px] lowercase opacity-60">Arraste a la izquierda para borrar</span>
                </p>
                {sharedContentList.map((item, index) => (
                  <SwipeableShareBanner
                    key={index}
                    item={item}
                    onRegister={() => {
                      if (canAddProduct) {
                        setEditingProduct(null);
                        setPrefillIndex(index);
                        setIsProdFormOpen(true);
                      } else {
                        setShowUpgrade(true);
                      }
                    }}
                    onDelete={() => removeSharedContent(index)}
                  />
                ))}
              </div>
            )}

            {prodLoading && products.length === 0 ? (
              <div className="grid gap-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="card p-4 flex gap-4">
                    <Skeleton className="w-20 h-20 rounded-xl flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-6 w-20" />
                    </div>
                  </div>
                ))}
              </div>
            ) : products.length === 0 ? (
              <EmptyState
                icon={searchQuery ? Search : Package}
                title={searchQuery ? "Sin resultados" : "Sin productos"}
                description={searchQuery ? `No encontramos productos que coincidan con "${searchQuery}"` : "Agrega los productos que deseas mostrar en este catálogo."}
                actionLabel={searchQuery ? "Limpiar búsqueda" : "Agregar Producto"}
                onAction={searchQuery ? () => setSearchQuery('') : handleAddAction}
              />
            ) : (
              <DragDropContext onDragEnd={onDragEnd}>
                <Droppable droppableId="products-list">
                  {(provided) => (
                    <div 
                      {...provided.droppableProps} 
                      ref={provided.innerRef}
                      className="grid grid-cols-1 gap-3"
                    >
                      {products.map((product, index) => (
                        <Draggable 
                          key={product.id} 
                          draggableId={product.id} 
                          index={index}
                          isDragDisabled={sortField !== 'position'}
                        >
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={`${snapshot.isDragging ? 'z-50' : ''}`}
                            >
                                  <ProductCard
                                    product={product}
                                    isSelected={selectedProductIds.includes(product.id)}
                                    onSelect={toggleSelectProduct}
                                    dragHandleProps={sortField === 'position' ? provided.dragHandleProps : undefined}
                                    shareTemplate={catalog?.share_template}
                                    catalogName={catalog?.name}
                                    catalogSlug={catalog?.slug}
                                    contactNumber={user?.phone}
                                    displayCurrency={catalog?.display_currency}
                                    usdToCupRate={catalog?.usd_to_cup_rate}
                                    cupToUsdRate={catalog?.cup_to_usd_rate}
                                    ownerPlan={user?.plan}
                                    onEdit={(p) => {
                                      setEditingProduct(p);
                                      setIsProdFormOpen(true);
                                    }}
                                    onDelete={setProductToDelete}
                                    onSendNow={hasInstance ? sendSingleProduct : undefined}
                                    isSending={sendingIds.has(`prod_${product.id}`)}
                                    onOutOfStock={(p) => setProductToAgotado(p)}
                                    onAvailable={(p) => setProductToAvailable(p)}
                                    onToggleActive={handleToggleProductActive}
                                    onUnlink={handleUnlinkProduct}
                                  />
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                      
                      {/* Sentinel for infinite scroll */}
                      {hasMore && (
                        <div 
                          ref={sentinelRef} 
                          className="h-20 flex items-center justify-center"
                        >
                          {prodLoading && (
                            <div className="flex flex-col items-center gap-2">
                              <RotateCcw className="animate-spin text-[var(--accent)]" size={20} />
                              <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Cargando más…</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>

            )}
          </div>
        )}
        
        {view === 'individual' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {msgLoading ? (
              <div className="grid gap-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="card p-6 space-y-4">
                    <div className="flex justify-between">
                      <Skeleton className="h-6 w-1/3" />
                      <div className="flex gap-2">
                        <Skeleton className="h-8 w-8 rounded-lg" />
                        <Skeleton className="h-8 w-8 rounded-lg" />
                      </div>
                    </div>
                    <Skeleton className="h-16 w-full" />
                  </div>
                ))}
              </div>
            ) : messages.filter(m => m.is_individual).length === 0 ? (
              <EmptyState
                icon={MessageSquare}
                title="Sin mensajes"
                description="Configura mensajes predefinidos para responder o enviar a tus clientes."
                actionLabel="Nuevo Mensaje"
                onAction={handleAddAction}
              />
            ) : (
              <DragDropContext onDragEnd={onDragEnd}>
                <Droppable droppableId="individual-messages">
                  {(provided) => (
                    <div 
                      {...provided.droppableProps} 
                      ref={provided.innerRef}
                      className="grid gap-4"
                    >
                      {messages.filter(m => m.is_individual).map((message, index) => (
                        <Draggable key={message.id} draggableId={message.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={`${snapshot.isDragging ? 'z-50' : ''}`}
                            >
                                <MessageCard
                                  message={message}
                                  isSelected={selectedMessageIds.includes(message.id)}
                                  onSelect={toggleSelectMessage}
                                  dragHandleProps={provided.dragHandleProps}
                                  onEdit={(m) => {
                                    setEditingMessage(m);
                                    setIsMsgFormOpen(true);
                                  }}
                                  onDelete={setMessageToDelete}
                                  onSendNow={hasInstance ? sendSingleMessage : undefined}
                                  isSending={sendingIds.has(`msg_${message.id}`)}
                                  onToggleSequence={hasInstance ? toggleMessageSequence : undefined}
                                />
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            )}
          </div>
        )}

        {view === 'sequences' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Control de Secuencia Minimalista */}
            <div className="flex items-center justify-between p-3 bg-surface border border-border rounded-2xl gap-4 shadow-sm">
              <Button 
                variant="ghost" 
                size="sm" 
                className="bg-[var(--accent)]/10 text-[var(--accent)] hover:bg-[var(--accent)] hover:text-black border-[var(--accent)]/30 px-4 py-5 rounded-xl text-[10px] font-bold uppercase tracking-widest"
                icon={Send} 
                loading={sendingIds.has(`catalog_${catalogId}`)}
                onClick={() => catalogId && sendCatalogToGroups(catalogId)}
              >
                Enviar ahora
              </Button>

              <div className="flex items-center gap-3">
                <Button
                  variant="secondary"
                  size="sm"
                  icon={Clock}
                  className="bg-surface-hover text-primary hover:bg-surface border-border px-4 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest"
                  onClick={() => setIsScheduleModalOpen(true)}
                >
                  Programar
                </Button>
                
                <div className="flex items-center gap-2 pr-1">
                  <Switch
                    checked={catalog?.is_sequence_scheduled || false}
                    onChange={(checked) => updateSequenceScheduled(checked)}
                  />
                </div>
              </div>
            </div>

            {msgLoading ? (
              <div className="grid gap-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="card p-6 flex items-center gap-4">
                    <Skeleton className="h-8 w-8 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-1/2" />
                      <Skeleton className="h-4 w-1/3" />
                    </div>
                    <Skeleton className="h-6 w-6 rounded" />
                  </div>
                ))}
              </div>
            ) : messages.filter(m => m.is_sequence).length === 0 ? (
              <EmptyState
                icon={Zap}
                title="Sin secuencia"
                description="Marca tus mensajes como 'Secuencia' para que aparezcan aquí y se envíen automáticamente."
                actionLabel="Nuevo Mensaje"
                onAction={() => {
                  setEditingMessage(null);
                  setIsMsgFormOpen(true);
                }}
              />
            ) : (
              <DragDropContext onDragEnd={onDragEnd}>
                <Droppable droppableId="sequence-messages">
                  {(provided) => (
                    <div 
                      {...provided.droppableProps} 
                      ref={provided.innerRef}
                      className="grid gap-4"
                    >
                      {messages.filter(m => m.is_sequence).map((message, index) => (
                        <Draggable key={message.id} draggableId={message.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={`${snapshot.isDragging ? 'z-50' : ''}`}
                            >
                                <MessageCard
                                  message={message}
                                  isSelected={selectedMessageIds.includes(message.id)}
                                  onSelect={toggleSelectMessage}
                                  dragHandleProps={provided.dragHandleProps}
                                  productCount={products.filter(p => p.is_active !== false).length}
                                  onEdit={(m) => {
                                    setEditingMessage(m);
                                    setIsMsgFormOpen(true);
                                  }}
                                  onDelete={setMessageToDelete}
                                  onSendNow={hasInstance ? sendSingleMessage : undefined}
                                  isSending={sendingIds.has(`msg_${message.id}`)}
                                  onToggleSequence={hasInstance ? toggleMessageSequence : undefined}
                                />
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            )}
          </div>
        )}

        {view === 'groups' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-4">
            {groupsLoading ? (
              <div className="grid gap-4">
                {[1, 2].map(i => (
                  <div key={i} className="card p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="space-y-1">
                        <Skeleton className="h-5 w-32" />
                        <Skeleton className="h-3 w-48" />
                      </div>
                    </div>
                    <Skeleton className="h-8 w-8 rounded-lg" />
                  </div>
                ))}
              </div>
            ) : linkedGroups.length === 0 ? (
              <EmptyState
                icon={Users}
                title="Sin grupos"
                description="Vincula los grupos de WhatsApp donde deseas enviar este catálogo."
                actionLabel="Vincular Grupos"
                onAction={() => setIsLinkGroupOpen(true)}
              />
            ) : (
              <>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1 mb-2 bg-surface-hover/20 p-3 rounded-2xl border border-border/40">
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {[1, 2, 3].map(num => {
                        const hasData = presets[num] && presets[num].length > 0;
                        return (
                          <button
                            key={num}
                            onPointerDown={(e) => handlePresetPointerDown(e, num)}
                            onPointerUp={(e) => handlePresetPointerUp(e, num)}
                            onPointerCancel={() => handlePresetPointerCancel(num)}
                            onPointerLeave={() => handlePresetPointerCancel(num)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all select-none duration-200 active:scale-95 ${
                              hasData 
                                ? 'bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/30 hover:bg-[var(--accent)]/20 shadow-md shadow-accent/5' 
                                : 'bg-surface border border-dashed border-white/10 text-[var(--text-secondary)] hover:border-white/20 hover:text-[var(--text-primary)]'
                            }`}
                            title={hasData ? `Aplicar G${num} con ${presets[num].length} grupos (Mantén presionado para sobrescribir)` : `G${num} vacío (Mantén presionado para guardar actual)`}
                          >
                            {hasData ? <Zap size={12} className="text-[var(--accent)]" /> : <ZapOff size={12} className="opacity-50" />}
                            <span>G{num}</span>
                            {hasData && (
                              <span className="ml-0.5 text-[9px] bg-[var(--accent)]/20 px-1.5 py-0.5 rounded-full font-bold">
                                {presets[num].length}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                    <span className="text-[9px] text-[var(--text-secondary)] opacity-60">
                      * Clic para aplicar. Mantén presionado (1.2s) para guardar los grupos activos actuales.
                    </span>
                  </div>

                  <Button 
                    variant="secondary" 
                    size="sm" 
                    icon={Plus}
                    onClick={() => setIsLinkGroupOpen(true)}
                    className="bg-[var(--accent)]/10 text-[var(--accent)] hover:bg-[var(--accent)]/20 border-white/5"
                  >
                    Vincular más grupos
                  </Button>
                </div>
                <div className="grid grid-cols-1 gap-4 w-full">
                  {linkedGroups.map(group => (
                    <GroupCard
                      key={group.id}
                      group={group}
                      onUnlink={() => setGroupUnlinkId(group.id)}
                      onToggle={toggleGroupStatus}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {view === 'members' && isOwner && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
            {/* Sección: Colaboradores del Catálogo */}
            <div className="card p-5 space-y-4 border-border">
              <div className="flex items-center gap-2 pb-3 border-b border-border">
                <Shield size={18} className="text-accent" />
                <h3 className="font-bold text-primary text-sm uppercase tracking-wider">Miembros Colaboradores</h3>
              </div>
              <p className="text-secondary text-xs">
                Los colaboradores pueden agregar, editar y eliminar productos en este catálogo, además de compartirlo en sus propios perfiles.
              </p>

              {/* Formulario de invitación de colaboradores */}
              <form 
                onSubmit={async (e) => {
                  e.preventDefault();
                  const form = e.currentTarget;
                  const phoneInput = form.elements.namedItem('collabPhone') as HTMLInputElement;
                  let phone = phoneInput.value.trim();
                  if (!phone) return;
                  
                  // Si tiene 8 dígitos (ej. móvil en Cuba), agregar prefijo +53
                  const digits = phone.replace(/\D/g, '');
                  if (digits.length === 8) {
                    phone = '+53' + digits;
                  }
                  
                  const success = await inviteMember(catalogId!, phone);
                  if (success) phoneInput.value = '';
                }}
                className="flex gap-2"
              >
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-secondary">+</span>
                  <input
                    name="collabPhone"
                    type="tel"
                    placeholder="Teléfono del colaborador (ej. 54911...)"
                    className="w-full bg-background border border-border rounded-xl h-10 pl-6 pr-3 text-xs focus:border-accent focus:outline-none transition-colors text-primary"
                    required
                  />
                </div>
                <Button type="submit" size="sm" className="h-10 px-4 flex-shrink-0">
                  Invitar
                </Button>
              </form>

              {/* Lista de colaboradores */}
              <div className="space-y-2 pt-2">
                {members.length === 0 ? (
                  <p className="text-[10px] text-secondary italic text-center py-2">No hay colaboradores añadidos aún.</p>
                ) : (
                  members.map((member: any) => (
                    <div key={member.id} className="flex justify-between items-center bg-background border border-border p-3 rounded-xl animate-in fade-in duration-200">
                      <div className="min-w-0 flex-1 pr-3">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-primary text-xs truncate">
                            {member.user_profile?.full_name || `+${member.invited_phone}`}
                          </span>
                          {member.user_profile?.full_name && (
                            <span className="text-[9px] text-secondary font-mono">+{member.invited_phone}</span>
                          )}
                        </div>
                        <span className={`inline-block text-[8px] font-black uppercase tracking-wider mt-1 px-1.5 py-0.5 rounded ${
                          member.status === 'accepted' 
                            ? 'bg-green-500/10 text-green-500 border border-green-500/20' 
                            : member.status === 'rejected'
                            ? 'bg-red-500/10 text-red-500 border border-red-500/20'
                            : 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20'
                        }`}>
                          {member.status === 'accepted' ? 'Aceptado' : member.status === 'rejected' ? 'Rechazado' : 'Pendiente'}
                        </span>
                      </div>
                      <button 
                        type="button"
                        onClick={() => removeMember(catalogId!, member.id)}
                        className="p-1.5 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors flex-shrink-0"
                        title="Eliminar miembro"
                      >
                        <UserMinus size={16} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Sección: Invitar Seguidores */}
            <div className="card p-5 space-y-4 border-border">
              <div className="flex items-center gap-2 pb-3 border-b border-border">
                <Users size={18} className="text-accent" />
                <h3 className="font-bold text-primary text-sm uppercase tracking-wider">Invitar Seguidores</h3>
              </div>
              <p className="text-secondary text-xs">
                Envía una invitación para que otros usuarios sigan tu catálogo. Recibirán la solicitud en su bandeja de catálogos seguidos.
              </p>

              <form 
                onSubmit={async (e) => {
                  e.preventDefault();
                  const form = e.currentTarget;
                  const phoneInput = form.elements.namedItem('followerPhone') as HTMLInputElement;
                  let phone = phoneInput.value.trim();
                  if (!phone) return;
                  
                  // Si tiene 8 dígitos (ej. móvil en Cuba), agregar prefijo +53
                  const digits = phone.replace(/\D/g, '');
                  if (digits.length === 8) {
                    phone = '+53' + digits;
                  }
                  
                  const success = await inviteFollower(catalogId!, phone);
                  if (success) phoneInput.value = '';
                }}
                className="flex gap-2"
              >
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-secondary">+</span>
                  <input
                    name="followerPhone"
                    type="tel"
                    placeholder="Teléfono del seguidor (ej. 54911...)"
                    className="w-full bg-background border border-border rounded-xl h-10 pl-6 pr-3 text-xs focus:border-accent focus:outline-none transition-colors text-primary"
                    required
                  />
                </div>
                <Button type="submit" size="sm" className="h-10 px-4 flex-shrink-0">
                  Enviar Invitación
                </Button>
              </form>
            </div>
          </div>
        )}
      </div>

      {view !== 'members' && (
        <div className="fixed bottom-24 right-6 z-20">
          <Button 
            size="lg"
            className="w-14 h-14 rounded-full flex items-center justify-center p-0" 
            icon={Plus}
            iconSize={24}
            onClick={handleAddAction}
            title={view === 'products' ? 'Nuevo Producto' : view === 'groups' ? 'Vincular Grupos' : 'Nuevo Mensaje'}
          />
        </div>
      )}

      {/* Evolution Config Modal */}
      <Modal 
        isOpen={isEvolutionOpen} 
        onClose={() => setIsEvolutionOpen(false)} 
        title="Configurar WhatsApp"
      >
        <div className="py-4">
          <EvolutionConfig 
            catalogId={catalogId} 
            onConnected={() => {
              setIsEvolutionOpen(false);
              // Solo abrir modal de grupos en la primera conexión (sin grupos vinculados)
              if (linkedGroups.length === 0) {
                setIsLinkGroupOpen(true);
              }
            }}
          />
        </div>
      </Modal>

      {/* Modales de Producto */}
      <ProductFormModal
        isOpen={isProdFormOpen}
        onClose={() => {
          setIsProdFormOpen(false);
          setPrefillIndex(null);
        }}
        product={editingProduct}
        prefilledData={prefillIndex !== null ? sharedContentList[prefillIndex] : null}
        categories={categories}
        onSave={async (form, id, file, shouldSend) => {
          try {
            const product = await saveProduct(form, id, file);
            if (product) {
              refreshLimits();
              if (shouldSend) {
                await sendProductAvailable(product);
              }
              if (prefillIndex !== null) {
                removeSharedContent(prefillIndex);
                setPrefillIndex(null);
              }
              return true;
            }
            return false;
          } catch (err) {
            return false;
          }
        }}
        loading={prodLoading}
      />

      {catalogId && (
        <ManageCategoriesModal
          isOpen={isCategoriesModalOpen}
          onClose={() => setIsCategoriesModalOpen(false)}
          catalogId={catalogId}
          onCategoriesChange={() => {
            getCategories();
            getProducts(true);
          }}
        />
      )}

      <ConfirmDialog
        isOpen={!!productToDelete}
        onClose={() => setProductToDelete(null)}
        onConfirm={async () => {
          if (productToDelete) {
            await deleteProduct(productToDelete);
            refreshLimits();
            setProductToDelete(null);
          }
        }}
        title="Eliminar Producto"
        message="¿Estás seguro de que deseas eliminar este producto? Esta acción no se puede deshacer."
      />

      {/* Modales de Mensaje */}
      <MessageFormModal
        isOpen={isMsgFormOpen}
        onClose={() => setIsMsgFormOpen(false)}
        message={editingMessage}
        onSave={async (form, id, file) => {
          const success = await saveMessage(form, id, file);
          return !!success;
        }}
        loading={msgLoading}
      />

      <ConfirmDialog
        isOpen={!!messageToDelete}
        onClose={() => setMessageToDelete(null)}
        onConfirm={async () => {
          if (messageToDelete) {
            await deleteMessage(messageToDelete);
            setMessageToDelete(null);
          }
        }}
        title="Eliminar Mensaje"
        message="¿Estás seguro de que deseas eliminar este mensaje?"
      />

      {/* Modales de Grupos */}
      <LinkGroupsModal
        isOpen={isLinkGroupOpen}
        onClose={() => setIsLinkGroupOpen(false)}
        availableGroups={availableGroups}
        onFetch={fetchAvailableGroups}
        onLink={async (group) => {
          await linkGroup(group);
          // Opcional: toast.success('Grupo vinculado');
        }}
        loading={groupsLoading}
      />

      <ConfirmDialog
        isOpen={!!groupUnlinkId}
        onClose={() => setGroupUnlinkId(null)}
        onConfirm={async () => {
          if (groupUnlinkId) {
            await unlinkGroup(groupUnlinkId);
            setGroupUnlinkId(null);
          }
        }}
        title="Desvincular Grupo"
        message="¿Estás seguro de que deseas desvincular este grupo?"
      />

      <ConfirmDialog
        isOpen={isRestoreOpen}
        onClose={() => setIsRestoreOpen(false)}
        onConfirm={restoreDefaultMessages}
        title="Restaurar Mensajes"
        message="¿Estás seguro de que deseas borrar todos los mensajes actuales y restaurar los mensajes predeterminados? Esta acción no se puede deshacer."
        confirmLabel="Restaurar"
        variant="danger"
      />

      <ConfirmDialog
        isOpen={isBulkDeleteConfirmOpen}
        onClose={() => setIsBulkDeleteConfirmOpen(false)}
        onConfirm={executeBulkDelete}
        title="Eliminar Selección"
        message={`¿Estás seguro de que deseas eliminar los ${selectedProductIds.length + selectedMessageIds.length} ítems seleccionados? Esta acción no se puede deshacer.`}
        variant="danger"
        confirmLabel="Eliminar todos"
      />

      <UpgradeModal
        isOpen={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        currentPlan={limits.products <= 8 ? 'free' : 'basic'}
        reachedLimit="products"
      />

      <ScheduleSequenceModal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        schedules={catalog?.sequence_schedules || []}
        onSave={handleSaveSchedules}
      />

      {/* Modal de Agotado */}
      <Modal
        isOpen={!!productToAgotado}
        onClose={() => setProductToAgotado(null)}
        title="Marcar como Agotado"
        footer={
          <div className="flex justify-between items-center w-full">
            <Button 
              variant="ghost" 
              onClick={() => setProductToAgotado(null)}
              disabled={isAgotadoLoading}
            >
              Cancelar
            </Button>
            <div className="flex gap-2">
              <Button 
                variant="secondary" 
                onClick={async () => {
                  if (productToAgotado) {
                    setIsAgotadoLoading(true);
                    try {
                      const { error } = await supabase
                        .from('products')
                        .update({ is_out_of_stock: true, stock_status: 'out_of_stock' })
                        .eq('id', productToAgotado.id);
                      
                      if (error) throw error;
                      toast.success('Producto marcado como agotado');
                      getProducts();
                      setProductToAgotado(null);
                    } catch (err: any) {
                      toast.error('Error: ' + err.message);
                    } finally {
                      setIsAgotadoLoading(false);
                    }
                  }
                }}
                loading={isAgotadoLoading}
              >
                Confirmar
              </Button>
              <Button 
                variant="primary" 
                icon={Send}
                onClick={async () => {
                  if (productToAgotado) {
                    setIsAgotadoLoading(true);
                    try {
                      // 1. Actualizar DB
                      const { error } = await supabase
                        .from('products')
                        .update({ is_out_of_stock: true, stock_status: 'out_of_stock' })
                        .eq('id', productToAgotado.id);
                      
                      if (error) throw error;
                      
                      // 2. Enviar a grupos
                      await sendProductOutOfStock(productToAgotado);
                      
                      getProducts();
                      setProductToAgotado(null);
                    } catch (err: any) {
                      toast.error('Error: ' + err.message);
                    } finally {
                      setIsAgotadoLoading(false);
                    }
                  }
                }}
                loading={isAgotadoLoading}
              >
                Confirmar y enviar
              </Button>
            </div>
          </div>
        }
      >
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-2xl bg-orange-500/10 text-orange-500">
            <PackageX size={24} />
          </div>
          <div>
            <p className="text-white font-bold mb-1">{productToAgotado?.name}</p>
            <p className="text-gray-400 text-sm leading-relaxed">
              ¿Deseas marcar este producto como agotado? Puedes solo confirmarlo en el sistema o enviarlo también como aviso a los grupos de WhatsApp vinculados.
            </p>
          </div>
        </div>
      </Modal>

      {/* Modal de Disponible */}
      <Modal
        isOpen={!!productToAvailable}
        onClose={() => setProductToAvailable(null)}
        title="Marcar como Disponible"
        footer={
          <div className="flex justify-between items-center w-full">
            <Button 
              variant="ghost" 
              onClick={() => setProductToAvailable(null)}
              disabled={isAgotadoLoading}
            >
              Cancelar
            </Button>
            <div className="flex gap-2">
              <Button 
                variant="secondary" 
                onClick={async () => {
                  if (productToAvailable) {
                    setIsAgotadoLoading(true);
                    try {
                      const { error } = await supabase
                        .from('products')
                        .update({ is_out_of_stock: false, stock_status: 'available' })
                        .eq('id', productToAvailable.id);
                      
                      if (error) throw error;
                      toast.success('Producto marcado como disponible');
                      getProducts();
                      setProductToAvailable(null);
                    } catch (err: any) {
                      toast.error('Error: ' + err.message);
                    } finally {
                      setIsAgotadoLoading(false);
                    }
                  }
                }}
                loading={isAgotadoLoading}
              >
                Confirmar
              </Button>
              <Button 
                variant="primary" 
                icon={Send}
                onClick={async () => {
                  if (productToAvailable) {
                    setIsAgotadoLoading(true);
                    try {
                      // 1. Actualizar DB
                      const { error } = await supabase
                        .from('products')
                        .update({ is_out_of_stock: false, stock_status: 'available' })
                        .eq('id', productToAvailable.id);
                      
                      if (error) throw error;
                      
                      // 2. Enviar a grupos
                      await sendProductAvailable(productToAvailable);
                      
                      getProducts();
                      setProductToAvailable(null);
                    } catch (err: any) {
                      toast.error('Error: ' + err.message);
                    } finally {
                      setIsAgotadoLoading(false);
                    }
                  }
                }}
                loading={isAgotadoLoading}
              >
                Confirmar y enviar
              </Button>
            </div>
          </div>
        }
      >
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-2xl bg-green-500/10 text-green-500">
            <PackageCheck size={24} />
          </div>
          <div>
            <p className="text-white font-bold mb-1">{productToAvailable?.name}</p>
            <p className="text-gray-400 text-sm leading-relaxed">
              ¿Deseas marcar este producto nuevamente como disponible? Puedes solo confirmarlo en el sistema o enviarlo también como aviso a los grupos de WhatsApp vinculados.
            </p>
          </div>
        </div>
      </Modal>
      <NemuImportModal
        isOpen={isNemuImportOpen}
        onClose={() => setIsNemuImportOpen(false)}
        catalogId={catalogId!}
        onSuccess={() => getProducts(true)}
      />

      <ExchangeRatesModal
        isOpen={isExchangeRatesOpen}
        onClose={() => setIsExchangeRatesOpen(false)}
        initialUsdToCup={catalog?.usd_to_cup_rate || 1.0}
        initialCupToUsd={catalog?.cup_to_usd_rate || 1.0}
        onSave={updateExchangeRates}
      />

      <ConfirmDialog
        isOpen={isClearQueueConfirmOpen}
        onClose={() => setIsClearQueueConfirmOpen(false)}
        onConfirm={handleClearQueue}
        title="Limpiar Cola de Envío"
        message="¿Estás seguro de que deseas eliminar todos los mensajes pendientes de envío para este catálogo? Esta acción detendrá cualquier envío en curso."
        confirmLabel="Limpiar Cola"
        cancelLabel="Mantener Mensajes"
        loading={isClearingQueue}
        variant="danger"
      />

      {/* Modal de Cola de Envío */}
      <Modal
        isOpen={isQueueModalOpen}
        onClose={() => setIsQueueModalOpen(false)}
        title="Cola de Envío Pendiente"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Próximos Envíos Programados</p>
            <button 
              onClick={fetchQueueItems}
              className="text-[10px] font-bold text-[var(--accent)] hover:underline uppercase tracking-wider cursor-pointer"
              disabled={isQueueLoading}
            >
              {isQueueLoading ? 'Actualizando...' : 'Actualizar'}
            </button>
          </div>

          {isQueueLoading ? (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
              <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Cargando cola...</span>
            </div>
          ) : queueItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
              <Clock size={36} className="text-gray-600 animate-pulse" />
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">No hay mensajes en cola</span>
              <p className="text-[10px] text-gray-500 max-w-[280px]">
                Cuando se cumpla el horario o intervalo de tus mensajes programados, aparecerán aquí antes de ser enviados.
              </p>
            </div>
          ) : (
            <div className="space-y-3.5 max-h-[350px] overflow-y-auto pr-1">
              {queueItems.map((item) => {
                const date = new Date(item.scheduled_at);
                const localTime = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const payload = item.payload || {};
                const contentText = payload.text || payload.caption || 'Sin contenido';
                const isError = item.status === 'error';

                return (
                  <div 
                    key={item.id} 
                    className={`p-3 rounded-2xl bg-white/5 border flex flex-col gap-1.5 transition-all ${
                      isError ? 'border-red-500/20 bg-red-500/5' : 'border-white/5 hover:border-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-bold uppercase tracking-widest text-[var(--accent)] bg-[var(--accent)]/10 px-2 py-0.5 rounded-full">
                        {localTime}
                      </span>
                      <span className={`text-[8px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${
                        isError ? 'bg-red-500/20 text-red-400' : 'bg-orange-500/10 text-orange-400'
                      }`}>
                        {isError ? 'Error' : 'Pendiente'}
                      </span>
                    </div>

                    <p className="text-xs text-primary font-medium line-clamp-2 leading-relaxed">
                      {contentText}
                    </p>

                    <div className="flex items-center gap-1.5 text-[9px] text-secondary mt-1 font-semibold">
                      <span className="text-gray-400">Grupo ID:</span>
                      <span className="truncate max-w-[150px]">{item.group_id}</span>
                    </div>

                    {isError && item.error_message && (
                      <p className="text-[9px] text-red-400/80 italic mt-1 leading-relaxed bg-red-500/10 p-1.5 rounded-xl border border-red-500/10">
                        Error: {item.error_message}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div className="pt-3 border-t border-white/5 flex gap-2">
            {queueItems.length > 0 && (
              <button
                onClick={async () => {
                  if (confirm('¿Estás seguro de que deseas vaciar toda la cola de envío pendiente de este catálogo?')) {
                    await handleClearQueue();
                    setIsQueueModalOpen(false);
                  }
                }}
                className="flex-1 py-2 px-3 rounded-xl border border-red-500/20 hover:bg-red-500/10 text-red-400 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
              >
                Vaciar cola
              </button>
            )}
            <button
              onClick={() => setIsQueueModalOpen(false)}
              className="flex-1 py-2 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
