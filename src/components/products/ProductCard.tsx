import React from 'react';
import type { Product } from '../../types/product';
import { Edit3, Trash2, Tag, Send } from 'lucide-react';

interface ProductCardProps {
  product: Product;
  onEdit: (product: Product) => void;
  onDelete: (id: string) => void;
  onSendNow?: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onEdit, onDelete, onSendNow }) => {
  return (
    <div className="card group hover:border-[#25D366]/30 transition-all flex gap-4">
      <div className="w-24 h-24 rounded-xl bg-white/5 flex-shrink-0 overflow-hidden relative">
        {product.imagen_url ? (
          <img 
            src={product.imagen_url} 
            alt={product.name} 
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-700">
            <Tag size={32} />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0 py-1">
        <div className="flex justify-between items-start">
          <h3 className="text-white font-bold truncate group-hover:text-[#25D366] transition-colors">
            {product.name}
          </h3>
          <div className="flex gap-1">
            {onSendNow && (
              <button 
                onClick={() => onSendNow(product)}
                className="p-1 px-2 text-gray-500 hover:text-[#25D366] hover:bg-[#25D366]/10 rounded-lg transition-colors text-xs flex items-center gap-1"
              >
                <Send size={14} />
                <span>Enviar ahora</span>
              </button>
            )}
            <button 
              onClick={() => onEdit(product)}
              className="p-1 px-2 text-gray-500 hover:text-white hover:bg-white/5 rounded-lg transition-colors text-xs flex items-center gap-1"
            >
              <Edit3 size={14} />
              <span>Editar</span>
            </button>
            <button 
              onClick={() => onDelete(product.id)}
              className="p-1 px-2 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors text-xs flex items-center gap-1"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
        
        <p className="text-gray-400 text-xs line-clamp-2 mt-1 leading-relaxed">
          {product.description || 'Sin descripción'}
        </p>

        <div className="mt-2 flex items-center justify-between">
          <span className="text-[#25D366] font-bold text-sm">
            {product.price ? `${product.price} ${product.currency}` : 'Precio no definido'}
          </span>
          {!product.is_active && (
            <span className="text-[10px] bg-red-500/10 text-red-500 px-2 py-0.5 rounded-full font-bold uppercase tracking-widest">
              Inactivo
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
