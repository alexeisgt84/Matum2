import React from 'react';
import type { WhatsAppMessage } from '../../types/message';
import { Edit3, Trash2, MessageSquare, Image, MousePointer2, Package, Clock, Send } from 'lucide-react';

interface MessageCardProps {
  message: WhatsAppMessage;
  productCount?: number;
  onEdit: (message: WhatsAppMessage) => void;
  onDelete: (id: string) => void;
  onSendNow?: (message: WhatsAppMessage) => void;
}

export const MessageCard: React.FC<MessageCardProps> = ({ message, productCount, onEdit, onDelete, onSendNow }) => {
  const icons = {
    text: MessageSquare,
    image: Image,
    button: MousePointer2,
    product: Package,
    catalog_products: Package,
  };

  const Icon = icons[message.type as keyof typeof icons] || MessageSquare;
  const isCatalog = message.type === 'catalog_products';

  return (
    <div className={`card group hover:border-[#25D366]/30 transition-all flex items-start gap-4 ${isCatalog ? 'border-[#25D366]/20 bg-[#25D366]/5' : ''}`}>
      {message.image_url ? (
        <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 border border-white/5 bg-white/5">
          <img src={message.image_url} alt="" className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className={`p-3 rounded-xl flex-shrink-0 ${
          isCatalog ? 'bg-[#25D366] text-black' :
          message.type === 'text' ? 'bg-blue-500/10 text-blue-500' :
          message.type === 'image' ? 'bg-purple-500/10 text-purple-500' :
          message.type === 'button' ? 'bg-amber-500/10 text-amber-500' :
          'bg-[#25D366]/10 text-[#25D366]'
        }`}>
          <Icon size={24} />
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start">
          <div className="flex flex-col">
            <h3 className="text-white font-bold truncate group-hover:text-[#25D366] transition-colors uppercase text-[11px] tracking-widest">
              {isCatalog ? 'Catálogo de Productos' : message.name}
            </h3>
            {!isCatalog && message.scheduled_time && (
              <div className="flex items-center gap-1.5 text-[10px] text-gray-500 mt-0.5">
                <Clock size={10} />
                <span className="text-[#25D366] font-bold">Programado: {message.scheduled_time}</span>
              </div>
            )}
            {isCatalog && (
              <div className="flex items-center gap-1.5 text-[10px] text-[#25D366] mt-0.5 font-bold">
                <Package size={10} />
                <span>{productCount || 0} Productos configurados</span>
              </div>
            )}
          </div>
          <div className="flex gap-1">
            <button 
              onClick={() => onSendNow?.(message)}
              className="p-1 px-2 text-gray-500 hover:text-[#25D366] hover:bg-[#25D366]/10 rounded-lg transition-colors text-xs flex items-center gap-1"
            >
              <Send size={14} />
              <span>Enviar ahora</span>
            </button>

            {!isCatalog && (
              <>
                <button 
                  onClick={() => onEdit(message)}
                  className="p-1 px-2 text-gray-500 hover:text-white hover:bg-white/5 rounded-lg transition-colors text-xs flex items-center gap-1"
                >
                  <Edit3 size={14} />
                  <span>Editar</span>
                </button>
                <button 
                  onClick={() => onDelete(message.id)}
                  className="p-1 px-2 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors text-xs flex items-center gap-1"
                >
                  <Trash2 size={14} />
                </button>
              </>
            )}
          </div>
        </div>

        <div className="mt-3 p-3 bg-white/5 rounded-xl border border-white/5">
          <p className="text-gray-400 text-sm whitespace-pre-wrap line-clamp-3 leading-relaxed">
            {isCatalog ? (
              'En este punto de la secuencia se enviará la lista completa de productos activos del catálogo siguiendo la plantilla configurada.'
            ) : !message.content ? (
              <span className="italic text-gray-500">Sin descripción</span>
            ) : (
              message.content.split(/(\*(?!\s).+?(?<!\s)\*|_(?!\s).+?(?<!\s)_)/g).map((part, i) => {
                if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
                  return <strong key={i} className="text-white font-bold">{part.slice(1, -1)}</strong>;
                }
                if (part.startsWith('_') && part.endsWith('_') && part.length > 2) {
                  return <em key={i} className="text-gray-300 italic">{part.slice(1, -1)}</em>;
                }
                return part;
              })
            )}
          </p>
        </div>
      </div>
    </div>
  );
};
