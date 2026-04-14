import React, { useState, useEffect } from 'react';
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
  AlertCircle
} from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { EmptyState } from '../../components/ui/EmptyState';
import { useProducts } from '../../hooks/useProducts';
import { useMessages } from '../../hooks/useMessages';
import { useWhatsAppGroups } from '../../hooks/useWhatsAppGroups';
import { useSendingEngine } from '../../hooks/useSendingEngine';
import { usePlanLimits } from '../../hooks/usePlanLimits';
import { ProductCard } from '../../components/products/ProductCard';
import { ProductFormModal } from '../../components/products/ProductFormModal';
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
import { DropdownMenu } from '../../components/ui/DropdownMenu';
import { toast } from 'react-hot-toast';
import { useEvolution } from '../../hooks/useEvolution';
import type { Product } from '../../types/product';
import type { WhatsAppMessage } from '../../types/message';
import { Skeleton } from '../../components/ui/Skeleton';
import { CatalogStatusBar } from '../../components/catalogs/CatalogStatusBar';

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

  // Hooks de Producto
  const { products, loading: prodLoading, getProducts, saveProduct, deleteProduct, updateProductsOrder } = useProducts(catalogId);
  
  // Hooks de Mensaje
  const { messages, loading: msgLoading, getMessages, saveMessage, deleteMessage, updateMessagesOrder } = useMessages(catalogId);
  
  // Hooks de Grupos (Seguimos usándolos para el modal de grupos)
  const { linkedGroups, loading: groupsLoading, getLinkedGroups, fetchAvailableGroups, linkGroup, unlinkGroup } = useWhatsAppGroups(catalogId);

  // Motor de Envío
  const { sendCatalogToGroups, sendSingleMessage, sendSingleProduct, sending } = useSendingEngine(catalogId);

  const { counts, limits, canAddProduct, refresh: refreshLimits } = usePlanLimits();

  // Estados de Modales
  const [isProdFormOpen, setIsProdFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);

  const [isMsgFormOpen, setIsMsgFormOpen] = useState(false);
  const [editingMessage, setEditingMessage] = useState<WhatsAppMessage | null>(null);
  const [messageToDelete, setMessageToDelete] = useState<string | null>(null);

  const [isLinkGroupOpen, setIsLinkGroupOpen] = useState(false);
  const [groupUnlinkId, setGroupUnlinkId] = useState<string | null>(null);

  const [showUpgrade, setShowUpgrade] = useState(false);
  const [isRestoreOpen, setIsRestoreOpen] = useState(false);
  
  const [tempTime, setTempTime] = useState<string>('');
  const [queueStats, setQueueStats] = useState({ pending: 0, sent: 0, error: 0 });
  const [statsLoading, setStatsLoading] = useState(false);

  useEffect(() => {
    if (catalog?.sequence_start_time) {
      setTempTime(catalog.sequence_start_time);
    }
  }, [catalog?.sequence_start_time]);

  useEffect(() => {
    loadCatalog();
    getProducts();
    getMessages();
    getLinkedGroups();
  }, [catalogId, getProducts, getMessages, getLinkedGroups]);

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
      
      const optionsItems = [
        { 
          label: 'Configurar catálogo', 
          icon: Settings, 
          onClick: () => navigate(`/catalogs/${catalogId}/edit`) 
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
            <StatBadge icon={Users} value={linkedGroups.filter(g => g.is_active).length} color="text-[#25D366]" />
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
    } catch (err: any) {
      toast.error('Error al actualizar programación');
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
    <div className="flex flex-col h-[calc(100vh-9rem)]">
      {/* Selector de Vistas */}
      <div className="px-4 py-6 bg-gradient-to-b from-[#1a1a1a] to-[#0a0a0a] border-b border-white/5">

        {/* Triple Switch Moderno */}
        <div className="relative flex p-1.5 bg-white/5 rounded-2xl border border-white/5 backdrop-blur-sm">
          <button
            onClick={() => setView('individual')}
            className={`relative z-10 flex-1 flex flex-col items-center justify-center gap-1 py-3 rounded-xl transition-all duration-300 min-w-0 ${
              view === 'individual' ? 'text-[#25D366]' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <MessageSquare size={18} className={view === 'individual' ? 'animate-pulse' : ''} />
            <span className="font-bold text-[9px] sm:text-[10px] uppercase tracking-wider text-center truncate w-full px-1">Mensajes</span>
          </button>
          
          <button
            onClick={() => setView('products')}
            className={`relative z-10 flex-1 flex flex-col items-center justify-center gap-1 py-3 rounded-xl transition-all duration-300 min-w-0 ${
              view === 'products' ? 'text-[#25D366]' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <Package size={18} className={view === 'products' ? 'animate-pulse' : ''} />
            <span className="font-bold text-[9px] sm:text-[10px] uppercase tracking-wider text-center truncate w-full px-1">Productos</span>
          </button>

          <button
            onClick={() => setView('sequences')}
            className={`relative z-10 flex-1 flex flex-col items-center justify-center gap-1 py-3 rounded-xl transition-all duration-300 min-w-0 ${
              view === 'sequences' ? 'text-[#25D366]' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <Zap size={18} className={view === 'sequences' ? 'animate-pulse' : ''} />
            <span className="font-bold text-[9px] sm:text-[10px] uppercase tracking-wider text-center truncate w-full px-1">Secuencia</span>
          </button>

          {/* Indicador Deslizante */}
          <div 
            className="absolute top-1.5 bottom-1.5 left-1.5 transition-all duration-500 ease-out bg-white/10 rounded-xl border border-white/10 shadow-[0_0_20px_rgba(37,211,102,0.1)]"
            style={{ 
              width: 'calc((100% - 12px) / 3)',
              transform: `translateX(${view === 'individual' ? '0%' : view === 'products' ? '100%' : view === 'sequences' ? '200%' : '0%'})`
            }}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-32">
        {view === 'products' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {prodLoading ? (
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
                icon={Package}
                title="Sin productos"
                description="Agrega los productos que deseas mostrar en este catálogo."
                actionLabel="Agregar Producto"
                onAction={handleAddAction}
              />
            ) : (
              <DragDropContext onDragEnd={onDragEnd}>
                <Droppable droppableId="products-list">
                  {(provided) => (
                    <div 
                      {...provided.droppableProps} 
                      ref={provided.innerRef}
                      className="grid gap-4"
                    >
                      {products.map((product, index) => (
                        <Draggable key={product.id} draggableId={product.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={`${snapshot.isDragging ? 'z-50' : ''}`}
                            >
                              <div className="relative group">
                                <div 
                                  {...provided.dragHandleProps}
                                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white cursor-grab active:cursor-grabbing p-2"
                                >
                                  <GripVertical size={20} />
                                </div>
                                <ProductCard
                                  product={product}
                                  onEdit={(p) => {
                                    setEditingProduct(p);
                                    setIsProdFormOpen(true);
                                  }}
                                  onDelete={setProductToDelete}
                                  onSendNow={sendSingleProduct}
                                />
                              </div>
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
            ) : messages.length === 0 ? (
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
                      {messages.map((message, index) => (
                        <Draggable key={message.id} draggableId={message.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={`${snapshot.isDragging ? 'z-50' : ''}`}
                            >
                              <div className="relative group">
                                <div 
                                  {...provided.dragHandleProps}
                                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white cursor-grab active:cursor-grabbing p-2"
                                >
                                  <GripVertical size={20} />
                                </div>
                                <MessageCard
                                  message={message}
                                  onEdit={(m) => {
                                    setEditingMessage(m);
                                    setIsMsgFormOpen(true);
                                  }}
                                  onDelete={setMessageToDelete}
                                  onSendNow={sendSingleMessage}
                                />
                              </div>
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
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-2xl border border-white/10 gap-4">
              <Button 
                variant="ghost" 
                size="sm" 
                className="bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366] hover:text-black border-[#25D366]/30 px-4 py-5 rounded-xl text-[10px] font-bold uppercase tracking-widest"
                icon={Send} 
                loading={sending}
                onClick={() => catalogId && sendCatalogToGroups(catalogId)}
              >
                Enviar ahora
              </Button>

              <div className="flex items-center gap-3">
                {catalog?.is_sequence_scheduled && (
                  <div className="animate-in slide-in-from-right-2 duration-300 flex items-center gap-1">
                    <input 
                      type="time" 
                      value={tempTime || '09:00'}
                      onChange={(e) => setTempTime(e.target.value)}
                      onClick={(e) => {
                        try {
                          e.currentTarget.showPicker();
                        } catch (err) {
                          // ignore if not supported
                        }
                      }}
                      onKeyDown={(e) => e.preventDefault()}
                      style={{ colorScheme: 'dark' }}
                      className="bg-black/60 border border-white/5 rounded-lg pl-2 pr-1 py-1.5 text-white text-xs focus:outline-none focus:border-[#25D366]/50 transition-all font-mono cursor-pointer [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:invert-[0.8]"
                    />
                    {tempTime !== catalog?.sequence_start_time && (
                      <button
                        onClick={() => updateSequenceStartTime(tempTime)}
                        className="p-1.5 bg-[#25D366]/20 text-[#25D366] rounded-md hover:bg-[#25D366] hover:text-black transition-colors border border-[#25D366]/30"
                        title="Confirmar hora"
                      >
                        <Check size={14} strokeWidth={3} />
                      </button>
                    )}
                  </div>
                )}
                
                <div className="flex items-center gap-2 pr-1">
                  <Switch
                    label="Programar"
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
                              <div className="relative group">
                                <div 
                                  {...provided.dragHandleProps}
                                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white cursor-grab active:cursor-grabbing p-2"
                                >
                                  <GripVertical size={20} />
                                </div>
                                <MessageCard
                                  message={message}
                                  productCount={products.filter(p => p.is_active).length}
                                  onEdit={(m) => {
                                    setEditingMessage(m);
                                    setIsMsgFormOpen(true);
                                  }}
                                  onDelete={setMessageToDelete}
                                  onSendNow={sendSingleMessage}
                                />
                              </div>
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
                    className="bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 border-white/5"
                  >
                    Vincular más grupos
                  </Button>
                </div>
                <div className="grid gap-4">
                  {linkedGroups.map(group => (
                    <GroupCard
                      key={group.id}
                      group={group}
                      onUnlink={() => setGroupUnlinkId(group.id)}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* FAB para agregar contenido */}
      <div className="fixed bottom-24 right-6 z-20">
        <Button 
          size="lg"
          className="w-14 h-14 rounded-full shadow-[0_8px_30px_rgb(37,211,102,0.4)] flex items-center justify-center p-0" 
          icon={Plus}
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
        onSave={async (form, id, file) => {
          const ok = await saveProduct(form, id, file);
          if (ok) refreshLimits();
          return ok;
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
        onSave={saveMessage}
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

      <UpgradeModal
        isOpen={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        currentPlan={limits.products <= 8 ? 'free' : 'basic'}
        reachedLimit="products"
      />
    </div>
  );
};
