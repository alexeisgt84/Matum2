import React from 'react';
import type { Product } from '../../types/product';
import { Edit3, Trash2, Tag } from 'lucide-react';

interface ProductCardProps {
  product: Product;
  onEdit: (product: Product) => void;
  onDelete: (id: string) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onEdit, onDelete }) => {
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
            <button 
              onClick={() => onEdit(product)}
              className="p-1.5 text-gray-500 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
            >
              <Edit3 size={16} />
            </button>
            <button 
              onClick={() => onDelete(product.id)}
              className="p-1.5 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
            >
              <Trash2 size={16} />
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
