import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
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
  X
} from 'lucide-react';
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
import { NemuImportModal } from '../../components/catalogs/NemuImportModal';
import { MessageCard } from '../../components/messages/MessageCard';
import { MessageFormModal } from '../../components/messages/MessageFormModal';
import { GroupCard } from '../../components/groups/GroupCard';
import { LinkGroupsModal } from '../../components/groups/LinkGroupsModal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { UpgradeModal } from '../../components/ui/UpgradeModal';
import { Modal } from '../../components/ui/Modal';
import { Switch } from '../../components/ui/Switch';
import { EvolutionConfig } from '../../components/profile/EvolutionConfig';
import { useHeader } from '../../lib/HeaderContext';
import { DropdownMenu, type DropdownItem } from '../../components/ui/DropdownMenu';
import { toast } from 'react-hot-toast';
import { useEvolution } from '../../hooks/useEvolution';
import type { Product } from '../../types/product';
import type { WhatsAppMessage } from '../../types/message';
import { Skeleton } from '../../components/ui/Skeleton';
import { CatalogStatusBar } from '../../components/catalogs/CatalogStatusBar';
import { ScheduleSequenceModal } from '../../components/catalogs/ScheduleSequenceModal';
import type { SequenceSchedule } from '../../types/catalog';

type View = 'individual' | 'sequences' | 'products' | 'groups';

export const CatalogDetailPage = () => {
  const { catalogId } = useParams();
  const navigate = useNavigate();
  const { setTitle, setSubtitle, setRightAction } = useHeader();
  
  const [view, setView] = useState<View>('individual');
  const [catalog, setCatalog] = useState<any>(null);
  const [catLoading, setCatLoading] = useState(true);

  // Modales
  const [isEvolutionOpen, setIsEvolutionOpen] = useState(false);

  // Hooks de Evolución (para saber si está conectado)
  const { instance } = useEvolution(catalogId);

  // Estados de Búsqueda y Ordenación
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortField, setSortField] = useState('position');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Debounce para la búsqueda
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Hooks de Producto
  const { products, loading: prodLoading, hasMore, loadMore, getProducts, saveProduct, deleteProduct, updateProductsOrder } = useProducts(catalogId, debouncedSearch, sortField, sortOrder);
  
  // Hooks de Mensaje
  const { messages, loading: msgLoading, getMessages, saveMessage, deleteMessage, updateMessagesOrder, toggleMessageSequence } = useMessages(catalogId);
  
  // Hooks de Grupos (Seguimos usándolos para el modal de grupos)
  const { linkedGroups, availableGroups, loading: groupsLoading, getLinkedGroups, fetchAvailableGroups, linkGroup, unlinkGroup, toggleGroupStatus } = useWhatsAppGroups(catalogId);


  // Motor de Envío
  const { sendCatalogToGroups, sendSingleMessage, sendSingleProduct, sendProductOutOfStock, sendProductAvailable, sendingIds } = useSendingEngine(catalogId);

  const { counts, limits, canAddProduct, refresh: refreshLimits } = usePlanLimits();

  // Estados de Modales
  const [isProdFormOpen, setIsProdFormOpen] = useState(false);
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

  const [showUpgrade, setShowUpgrade] = useState(false);
  const [isRestoreOpen, setIsRestoreOpen] = useState(false);
  const [isNemuImportOpen, setIsNemuImportOpen] = useState(false);
  
  const [statsLoading, setStatsLoading] = useState(false);
  const [queueStats, setQueueStats] = useState({ pending: 0, sent: 0, error: 0 });
  const [tempTime, setTempTime] = useState('');
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);

  
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
  }, [catalogId, getMessages, getLinkedGroups, debouncedSearch, sortField, sortOrder]);


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
      
      const optionsItems: DropdownItem[] = [
        { 
          label: 'Configurar catálogo', 
          icon: Settings, 
          onClick: () => navigate(`/catalogs/${catalogId}/edit`) 
        },
        { 
          label: 'Configurar plantillas', 
          icon: Layout, 
          onClick: () => navigate(`/catalogs/${catalogId}/templates`) 
        },
        { 
          label: 'Limpiar cola de envío', 
          icon: Trash2, 
          onClick: () => setIsClearQueueConfirmOpen(true),
          variant: 'danger'
        },
        { 
          label: 'Conectar WhatsApp', 
          icon: Smartphone, 
          onClick: () => setIsEvolutionOpen(true) 
        },
        { 
          label: 'Restaurar mensajes', 
          icon: RotateCcw, 
          onClick: () => setIsRestoreOpen(true) 
        },
        { 
          label: 'Vincular con Nemu', 
          icon: ShoppingBag, 
          onClick: () => setIsNemuImportOpen(true) 
        },
      ];

      // Solo mostrar "Grupos" si hay una instancia conectada
      if (instance?.status === 'connected') {
        optionsItems.push({ 
          label: 'Grupos', 
          icon: Users, 
          onClick: () => setView('groups') 
        });
      }

      const StatBadge = ({ icon: Icon, value, color }: { icon: any, value: number, color: string }) => (
        <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-white/5 border border-white/5">
          <Icon size={12} className={color} />
          <span className="text-[10px] font-bold text-gray-300 tabular-nums">{value}</span>
        </div>
      );

      setRightAction(
        <div className="flex items-center gap-2">
          {/* Mini Stats discreet */}
          <div className="hidden sm:flex items-center gap-1.5 mr-2">
            <StatBadge icon={MessageSquare} value={messages.length} color="text-blue-400" />
            <StatBadge icon={Zap} value={messages.filter(m => m.is_sequence).length} color="text-yellow-400" />
            <StatBadge icon={Package} value={products.length} color="text-purple-400" />
            <StatBadge icon={Users} value={linkedGroups.filter(g => g.is_active).length} color="text-[var(--accent)]" />
            {queueStats.pending > 0 && (
              <StatBadge icon={Clock} value={queueStats.pending} color="text-orange-400 animate-pulse" />
            )}
            {queueStats.error > 0 && (
              <StatBadge icon={AlertCircle} value={queueStats.error} color="text-red-400" />
            )}
          </div>

          <DropdownMenu 
            items={optionsItems} 
            trigger={
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors border border-white/5 text-gray-400 hover:text-white">
                <Settings size={18} />
                <span className="text-[10px] font-bold uppercase tracking-wider">Opciones</span>
              </button>
            }
          />
        </div>
      );
    }

    return () => {
      setTitle(null);
      setSubtitle(null);
      setRightAction(null);
    };
  }, [catalog, catalogId, navigate, setTitle, setSubtitle, setRightAction, instance?.status, messages.length, products.length, linkedGroups, queueStats]);

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
      
      if (!scheduled && queueStats.pending > 0) {
        setIsClearQueueConfirmOpen(true);
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
    const toastId = toast.loading('Limpiando cola de envío...');
    try {
      const { error } = await supabase
        .from('wa_message_queue')
        .delete()
        .eq('catalog_id', catalogId)
        .eq('status', 'pending');
      
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

  // Acciones Masivas
  const handleBulkDeleteInitiate = () => {
    const total = selectedProductIds.length + selectedMessageIds.length;
    if (total > 0) {
      setIsBulkDeleteConfirmOpen(true);
    }
  };

  const executeBulkDelete = async () => {
    const total = selectedProductIds.length + selectedMessageIds.length;
    const toastId = toast.loading('Eliminando ítems...');
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

    const toastId = toast.loading(`Iniciando envío de ${total} ítems...`);
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

    const toastId = toast.loading('Actualizando secuencia...');
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
    const toastId = toast.loading(`Marcando ${selectedProductIds.length} productos como ${isOutOfStock ? 'agotados' : 'disponibles'}...`);
    
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
      {/* Selector de Vistas / Barra de Selección */}
      <div className="px-4 py-6 bg-gradient-to-b from-surface to-background border-b border-border w-full">
        {(selectedProductIds.length > 0 || selectedMessageIds.length > 0) ? (
          /* Barra de Selección Masiva (Integrada) */
          <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-accent text-black flex items-center justify-center font-bold text-xs shadow-lg shadow-accent/20">
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

              {selectedMessageIds.length > 0 && (
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
        ) : (
          /* Triple Switch Moderno */
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

          <button
            onClick={() => setView('sequences')}
            className={`relative z-10 flex-1 flex flex-col items-center justify-center gap-1 py-3 rounded-xl transition-all duration-300 min-w-0 ${
              view === 'sequences' ? 'text-accent' : 'text-secondary hover:text-primary'
            }`}
          >
            <Zap size={18} className={view === 'sequences' ? 'animate-pulse' : ''} />
            <span className="font-bold text-[9px] sm:text-[10px] uppercase tracking-wider text-center truncate w-full px-1">Secuencia</span>
          </button>

          {/* Indicador Deslizante */}
          <div 
            className="absolute top-1.5 bottom-1.5 left-1.5 transition-all duration-500 ease-out bg-primary/10 rounded-xl border border-primary/10 shadow-lg shadow-accent/10"
            style={{ 
              width: 'calc((100% - 12px) / 3)',
              transform: `translateX(${view === 'individual' ? '0%' : view === 'products' ? '100%' : view === 'sequences' ? '200%' : '0%'})`
            }}
          />
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-2 sm:px-4 py-4 pb-32">
        {view === 'products' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* Buscador y Ordenación */}
            <div className="flex items-center gap-2 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary" size={18} />
                <input
                  type="text"
                  placeholder="Buscar por nombre, descripción o precio..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-surface-hover border border-border rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
                />
              </div>
              
              <DropdownMenu
                trigger={
                  <button className="flex items-center gap-2 px-3 py-2.5 bg-surface-hover border border-border rounded-xl hover:bg-surface transition-colors">
                    <ArrowUpDown size={18} className="text-accent" />
                    <span className="hidden sm:inline text-xs font-bold uppercase">Ordenar</span>
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
                                    onEdit={(p) => {
                                      setEditingProduct(p);
                                      setIsProdFormOpen(true);
                                    }}
                                    onDelete={setProductToDelete}
                                    onSendNow={sendSingleProduct}
                                    isSending={sendingIds.has(`prod_${product.id}`)}
                                    onOutOfStock={(p) => setProductToAgotado(p)}
                                    onAvailable={(p) => setProductToAvailable(p)}
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
                              <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Cargando más...</span>
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
                                  onSendNow={sendSingleMessage}
                                  isSending={sendingIds.has(`msg_${message.id}`)}
                                  onToggleSequence={toggleMessageSequence}
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
                                  onSendNow={sendSingleMessage}
                                  isSending={sendingIds.has(`msg_${message.id}`)}
                                  onToggleSequence={toggleMessageSequence}
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
                <div className="flex justify-end px-1">
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
      </div>

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
        onClose={() => setIsProdFormOpen(false)}
        product={editingProduct}
        onSave={async (form, id, file, shouldSend) => {
          try {
            const product = await saveProduct(form, id, file);
            if (product) {
              refreshLimits();
              if (shouldSend) {
                await sendProductAvailable(product);
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
    </div>
  );
};
