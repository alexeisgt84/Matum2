import React from 'react';
import type { Product } from '../../types/product';
import { Edit3, Trash2, Tag, Send, PackageX, PackageCheck, GripVertical, Share2 } from 'lucide-react';
import { toast } from 'react-hot-toast';


import { shareContent } from '../../lib/share';

interface ProductCardProps {
  product: Product;
  onEdit: (product: Product) => void;
  onDelete: (id: string) => void;
  onSendNow?: (product: Product) => void;
  isSending?: boolean;
  onOutOfStock?: (product: Product) => void;
  onAvailable?: (product: Product) => void;
  dragHandleProps?: any;
  isSelected?: boolean;
  onSelect?: (id: string) => void;
  shareTemplate?: string | null;
  catalogName?: string | null;
}

export const ProductCard: React.FC<ProductCardProps> = ({ 
  product, 
  onEdit, 
  onDelete, 
  onSendNow, 
  isSending,
  onOutOfStock, 
  onAvailable,
  dragHandleProps,
  isSelected,
  onSelect,
  shareTemplate,
  catalogName
}) => {
  const handleShare = async () => {
    let text = '';
    if (shareTemplate) {
      text = shareTemplate
        .replace(/{product_name}/g, (product.name || '').trim())
        .replace(/{product_description}/g, (product.description || '').trim())
        .replace(/{product_price}/g, product.price ? `${product.price}`.trim() : 'Consultar')
        .replace(/{product_currency}/g, (product.currency || '').trim())
        .replace(/{catalog_name}/g, (catalogName || '').trim());
    } else {
      const priceText = product.price ? `${product.price} ${product.currency}` : 'S/P';
      text = `*${product.name}*\n\nPrecio: ${priceText}\n\n${product.description || ''}`.trim();
    }

    await shareContent({
      title: product.name,
      text: text,
      imageUrl: product.imagen_url || undefined
    });
  };

  return (
    <div className={`card group hover:border-accent/30 transition-all flex flex-col p-2 gap-1.5 relative ${product.is_out_of_stock ? 'opacity-75 grayscale-[0.5]' : ''} ${isSelected ? 'border-accent bg-accent/5 ring-1 ring-accent' : ''}`}>
      {/* Checkbox de Selección */}
      <button
        onClick={() => onSelect?.(product.id)}
        className={`absolute -top-2 -left-2 z-20 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all shadow-lg ${
          isSelected 
            ? 'bg-accent border-accent text-black scale-110' 
            : 'bg-surface border-border text-transparent opacity-0 group-hover:opacity-100 hover:border-accent'
        }`}
      >
        <div className={`w-2.5 h-2.5 rounded-full ${isSelected ? 'bg-black' : 'bg-transparent'}`} />
      </button>

      {/* Línea Superior: Botones de Acción */}
      <div className="flex justify-end gap-1 pb-1 flex-wrap sm:flex-nowrap">
        {onSendNow && !product.is_out_of_stock && (
          <button 
            onClick={() => onSendNow(product)}
            className="p-1 px-2 text-secondary hover:text-accent hover:bg-accent/10 rounded-lg transition-colors text-xs flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
            title="Enviar como producto normal"
            aria-label={`Enviar producto ${product.name}`}
            disabled={isSending}
          >
            <Send size={14} />
            <span className="hidden sm:inline">Enviar</span>
          </button>
        )}
        {onOutOfStock && !product.is_out_of_stock && (
          <button 
            onClick={() => onOutOfStock(product)}
            className="p-1 px-2 text-gray-500 hover:text-orange-500 hover:bg-orange-500/10 rounded-lg transition-colors text-xs flex items-center gap-1"
            title="Marcar como agotado"
            aria-label={`Marcar ${product.name} como agotado`}
          >
            <PackageX size={14} />
            <span className="hidden sm:inline">Agotado</span>
          </button>
        )}
        {onAvailable && product.is_out_of_stock && (
          <button 
            onClick={() => onAvailable(product)}
            className="p-1 px-2 text-gray-400 hover:text-[var(--accent)] hover:bg-[var(--accent)]/10 rounded-lg transition-colors text-xs flex items-center gap-1"
            title="Marcar como disponible"
            aria-label={`Marcar ${product.name} como disponible`}
          >
            <PackageCheck size={14} />
            <span className="hidden sm:inline">Disponible</span>
          </button>
        )}
        <button 
          onClick={() => onEdit(product)}
          className="p-1 px-2 text-secondary hover:text-primary hover:bg-surface-hover rounded-lg transition-colors text-xs flex items-center gap-1"
          aria-label={`Editar producto ${product.name}`}
        >
          <Edit3 size={14} />
          <span className="hidden sm:inline">Editar</span>
        </button>
        <button 
          onClick={handleShare}
          className="p-1 px-2 text-gray-500 hover:text-blue-500 hover:bg-blue-500/10 rounded-lg transition-colors text-xs flex items-center gap-1"
          title="Compartir producto"
          aria-label={`Compartir producto ${product.name}`}
        >
          <Share2 size={14} />
        </button>
        <button 
          onClick={() => onDelete(product.id)}
          className="p-1 px-2 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors text-xs flex items-center gap-1"
          aria-label={`Eliminar producto ${product.name}`}
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* Línea Inferior: Imagen, Título, Descripción y Grip */}
      <div className="flex gap-3 items-center">
        <div className="w-14 h-14 rounded-xl bg-surface-hover flex-shrink-0 overflow-hidden relative">
          {product.imagen_url ? (
            <img 
              src={product.imagen_url} 
              alt={product.name} 
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-secondary">
              <Tag size={24} />
            </div>
          )}
          {product.is_out_of_stock && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <span className="text-[8px] font-bold text-white uppercase tracking-widest border border-white/20 px-1 py-0.5 rounded bg-black/40">Agotado</span>
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-primary font-bold truncate group-hover:text-accent transition-colors uppercase text-[11px] tracking-widest">
            {product.name}
          </h3>
          <p className="text-secondary text-xs line-clamp-1 mt-0.5 leading-relaxed">
            {product.description || 'Sin descripción'}
          </p>
          <div className="mt-1.5 flex items-center gap-2">
            <span className="text-accent font-bold text-xs tabular-nums">
              {product.price ? `${product.price} ${product.currency}` : 'S/P'}
            </span>
            {product.is_out_of_stock && (
              <span className="text-[9px] bg-orange-500/10 text-orange-500 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-widest">
                Agotado
              </span>
            )}
            {!product.is_active && (
              <span className="text-[9px] bg-red-500/10 text-red-500 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-widest">
                Inactivo
              </span>
            )}
          </div>
        </div>

        {dragHandleProps && (
          <div 
            {...dragHandleProps}
            className="text-secondary hover:text-primary cursor-grab active:cursor-grabbing p-2"
          >
            <GripVertical size={20} />
          </div>
        )}
      </div>
    </div>
  );
};

