import React from 'react';
import type { WhatsAppMessage } from '../../types/message';
import { Edit3, Trash2, MessageSquare, Image, MousePointer2, Package, Clock, Send, GripVertical, Share2, Zap } from 'lucide-react';

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
    <div className={`card rounded-card group hover:border-accent/30 transition-all flex flex-col p-2.5 gap-2 relative ${isCatalog ? 'border-accent/20 bg-accent/5' : ''} ${isSelected ? 'border-accent ring-1 ring-accent' : ''}`}>
      {/* Checkbox de Selección */}
      <button
        onClick={() => onSelect?.(message.id)}
        className={`absolute -top-1.5 -left-1.5 z-20 w-5 h-5 rounded-none border flex items-center justify-center transition-all shadow ${
          isSelected 
            ? 'bg-accent border-accent text-black scale-105' 
            : 'bg-surface border-border text-transparent opacity-0 group-hover:opacity-100 hover:border-accent'
        }`}
      >
        <div className={`w-2 h-2 rounded-none ${isSelected ? 'bg-black' : 'bg-transparent'}`} />
      </button>

      {/* Línea Superior: Botones de Acción */}
      <div className="flex justify-end gap-1 border-b border-border pb-1.5">
        <button 
          onClick={() => onSendNow?.(message)}
          className="p-1.5 text-secondary hover:text-accent hover:bg-accent/10 rounded-none transition-colors flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
          title="Enviar ahora"
          aria-label={`Enviar mensaje ${message.name} ahora`}
          disabled={isSending}
        >
          <Send size={13} />
        </button>

        {!isCatalog && (
          <>
            <button 
              onClick={() => onToggleSequence?.(message)}
              className={`p-1.5 rounded-none transition-colors flex items-center justify-center ${
                message.is_sequence 
                  ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' 
                  : 'text-gray-500 hover:text-yellow-400 hover:bg-yellow-500/10'
              }`}
              title={message.is_sequence ? "Quitar de la secuencia" : "Agregar a la secuencia"}
              aria-label={message.is_sequence ? `Quitar ${message.name} de la secuencia` : `Agregar ${message.name} a la secuencia`}
            >
              <Zap size={13} className={message.is_sequence ? 'fill-yellow-400' : ''} />
            </button>

            <button 
              onClick={() => onEdit(message)}
              className="p-1.5 text-secondary hover:text-primary hover:bg-surface-hover rounded-none transition-colors flex items-center justify-center"
              title="Editar"
              aria-label={`Editar mensaje ${message.name}`}
            >
              <Edit3 size={13} />
            </button>
            <button 
              onClick={handleShare}
              className="p-1.5 text-gray-500 hover:text-blue-500 hover:bg-blue-500/10 rounded-none transition-colors flex items-center justify-center"
              title="Compartir mensaje"
              aria-label={`Compartir mensaje ${message.name}`}
            >
              <Share2 size={13} />
            </button>
            <button 
              onClick={() => onDelete(message.id)}
              className="p-1.5 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-none transition-colors flex items-center justify-center"
              title="Eliminar"
              aria-label={`Eliminar mensaje ${message.name}`}
            >
              <Trash2 size={13} />
            </button>
          </>
        )}
      </div>

      {/* Línea Inferior: Icono, Info, Contenido y Grip */}
      <div className="flex gap-2.5 items-start">
        {message.image_url ? (
          <div className="w-10 h-10 rounded-card overflow-hidden flex-shrink-0 border border-border bg-surface-hover">
            <img src={message.image_url} alt="" className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className={`p-2 rounded-none flex-shrink-0 ${
            isCatalog ? 'bg-accent text-black' :
            message.type === 'text' ? 'bg-blue-500/10 text-blue-500' :
            message.type === 'image' ? 'bg-purple-500/10 text-purple-500' :
            message.type === 'button' ? 'bg-amber-500/10 text-amber-500' :
            'bg-accent/10 text-accent'
          }`}>
            <Icon size={16} />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex flex-col">
            <h3 className="text-primary font-bold truncate group-hover:text-accent transition-colors uppercase text-[11px] tracking-wider">
              {isCatalog ? 'Catálogo de Productos' : message.name}
            </h3>
            {!isCatalog && (message.schedule_type === 'interval' ? (
              message.schedule_interval && (
                <div className="flex items-center gap-1 text-[10px] text-secondary mt-0.5">
                  <Clock size={9} />
                  <span className="text-accent font-bold tabular-nums">
                    Programado: Cada {message.schedule_interval >= 60 
                      ? `${message.schedule_interval / 60} ${message.schedule_interval / 60 === 1 ? 'hora' : 'horas'}` 
                      : `${message.schedule_interval} min`}
                  </span>
                </div>
              )
            ) : (
              message.fixed_schedules && message.fixed_schedules.length > 0 ? (
                <div className="flex items-center gap-1 text-[10px] text-secondary mt-0.5">
                  <Clock size={9} />
                  <span className="text-accent font-bold tabular-nums truncate max-w-[200px]" title={`Programado a las: ${message.fixed_schedules.map(s => s.time).join(', ')}`}>
                    Programado: {message.fixed_schedules.map(s => s.time).join(', ')}
                  </span>
                </div>
              ) : (
                message.scheduled_time && (
                  <div className="flex items-center gap-1 text-[10px] text-secondary mt-0.5">
                    <Clock size={9} />
                    <span className="text-accent font-bold tabular-nums">Programado: {message.scheduled_time}</span>
                  </div>
                )
              )
            ))}
            {isCatalog && (
              <div className="flex items-center gap-1 text-[10px] text-[var(--accent)] mt-0.5 font-bold">
                <Package size={9} />
                <span className="tabular-nums">{productCount || 0} Productos configurados</span>
              </div>
            )}
          </div>

          <div className="mt-1 text-secondary text-[11px] overflow-hidden">
            <p className="line-clamp-2 leading-snug">
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
            className="text-secondary hover:text-primary cursor-grab active:cursor-grabbing p-1 self-center"
          >
            <GripVertical size={16} />
          </div>
        )}
      </div>
    </div>
  );
};
