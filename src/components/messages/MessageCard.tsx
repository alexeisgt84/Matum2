import React from 'react';
import type { WhatsAppMessage } from '../../types/message';
import { Edit3, Trash2, MessageSquare, Image, MousePointer2, Package, Clock, Send, GripVertical, Share2, Zap } from 'lucide-react';
import { toast } from 'react-hot-toast';


import { shareContent } from '../../lib/share';

interface MessageCardProps {
  message: WhatsAppMessage;
  productCount?: number;
  onEdit: (message: WhatsAppMessage) => void;
  onDelete: (id: string) => void;
  onSendNow?: (message: WhatsAppMessage) => void;
  isSending?: boolean;
  onToggleSequence?: (message: WhatsAppMessage) => void;
  dragHandleProps?: any;
  isSelected?: boolean;
  onSelect?: (id: string) => void;
}

export const MessageCard: React.FC<MessageCardProps> = ({ 
  message, 
  productCount, 
  onEdit, 
  onDelete, 
  onSendNow,
  onToggleSequence,
  dragHandleProps,
  isSelected,
  onSelect,
  isSending
}) => {
  const icons = {
    text: MessageSquare,
    image: Image,
    button: MousePointer2,
    product: Package,
    catalog_products: Package,
  };

  const Icon = icons[message.type as keyof typeof icons] || MessageSquare;
  const isCatalog = message.type === 'catalog_products';

  const handleShare = async () => {
    const text = message.content || (isCatalog ? 'Catálogo de Productos' : message.name);
    
    await shareContent({
      title: isCatalog ? 'Catálogo de Productos' : message.name,
      text: text,
      imageUrl: message.image_url || undefined
    });
  };

  return (
    <div className={`card group hover:border-accent/30 transition-all flex flex-col p-3 gap-3 relative ${isCatalog ? 'border-accent/20 bg-accent/5' : ''} ${isSelected ? 'border-accent ring-1 ring-accent' : ''}`}>
      {/* Checkbox de Selección */}
      <button
        onClick={() => onSelect?.(message.id)}
        className={`absolute -top-2 -left-2 z-20 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all shadow-lg ${
          isSelected 
            ? 'bg-accent border-accent text-black scale-110' 
            : 'bg-surface border-border text-transparent opacity-0 group-hover:opacity-100 hover:border-accent'
        }`}
      >
        <div className={`w-2.5 h-2.5 rounded-full ${isSelected ? 'bg-black' : 'bg-transparent'}`} />
      </button>

      {/* Línea Superior: Botones de Acción */}
      <div className="flex justify-end gap-1.5 border-b border-border pb-2">
        <button 
          onClick={() => onSendNow?.(message)}
          className="p-2 text-secondary hover:text-accent hover:bg-accent/10 rounded-lg transition-colors flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
          title="Enviar ahora"
          disabled={isSending}
        >
          <Send size={15} />
        </button>

        {!isCatalog && (
          <>
            <button 
              onClick={() => onToggleSequence?.(message)}
              className={`p-2 rounded-lg transition-colors flex items-center justify-center ${
                message.is_sequence 
                  ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' 
                  : 'text-gray-500 hover:text-yellow-400 hover:bg-yellow-500/10'
              }`}
              title={message.is_sequence ? "Quitar de la secuencia" : "Agregar a la secuencia"}
            >
              <Zap size={15} className={message.is_sequence ? 'fill-yellow-400' : ''} />
            </button>

            <button 
              onClick={() => onEdit(message)}
              className="p-2 text-secondary hover:text-primary hover:bg-surface-hover rounded-lg transition-colors flex items-center justify-center"
              title="Editar"
            >
              <Edit3 size={15} />
            </button>
            <button 
              onClick={handleShare}
              className="p-2 text-gray-500 hover:text-blue-500 hover:bg-blue-500/10 rounded-lg transition-colors flex items-center justify-center"
              title="Compartir mensaje"
            >
              <Share2 size={15} />
            </button>
            <button 
              onClick={() => onDelete(message.id)}
              className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors flex items-center justify-center"
              title="Eliminar"
            >
              <Trash2 size={15} />
            </button>
          </>
        )}
      </div>

      {/* Línea Inferior: Icono, Info, Contenido y Grip */}
      <div className="flex gap-4 items-start">
        {message.image_url ? (
          <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 border border-border bg-surface-hover">
            <img src={message.image_url} alt="" className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className={`p-2.5 rounded-xl flex-shrink-0 ${
            isCatalog ? 'bg-accent text-black' :
            message.type === 'text' ? 'bg-blue-500/10 text-blue-500' :
            message.type === 'image' ? 'bg-purple-500/10 text-purple-500' :
            message.type === 'button' ? 'bg-amber-500/10 text-amber-500' :
            'bg-accent/10 text-accent'
          }`}>
            <Icon size={20} />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex flex-col">
            <h3 className="text-primary font-bold truncate group-hover:text-accent transition-colors uppercase text-[11px] tracking-widest">
              {isCatalog ? 'Catálogo de Productos' : message.name}
            </h3>
            {!isCatalog && message.scheduled_time && (
              <div className="flex items-center gap-1.5 text-[10px] text-secondary mt-0.5">
                <Clock size={10} />
                <span className="text-accent font-bold">Programado: {message.scheduled_time}</span>
              </div>
            )}
            {isCatalog && (
              <div className="flex items-center gap-1.5 text-[10px] text-[var(--accent)] mt-0.5 font-bold">
                <Package size={10} />
                <span>{productCount || 0} Productos configurados</span>
              </div>
            )}
          </div>

          <div className="mt-2 text-secondary text-xs overflow-hidden">
            <p className="line-clamp-2 leading-relaxed">
              {isCatalog ? (
                'En este punto de la secuencia se enviará la lista completa de productos.'
              ) : !message.content ? (
                <span className="italic text-secondary">Sin contenido</span>
              ) : (
                message.content.split(/(\*(?!\s).+?(?<!\s)\*|_(?!\s).+?(?<!\s)_)/g).map((part, i) => {
                  if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
                    return <strong key={i} className="text-primary font-bold">{part.slice(1, -1)}</strong>;
                  }
                  if (part.startsWith('_') && part.endsWith('_') && part.length > 2) {
                    return <em key={i} className="text-secondary italic">{part.slice(1, -1)}</em>;
                  }
                  return part;
                })
              )}
            </p>
          </div>
        </div>

        {dragHandleProps && (
          <div 
            {...dragHandleProps}
            className="text-secondary hover:text-primary cursor-grab active:cursor-grabbing p-2 self-center"
          >
            <GripVertical size={20} />
          </div>
        )}
      </div>
    </div>
  );
};

