import React from 'react';
import type { Product } from '../../types/product';
import { Edit3, Trash2, Tag, Send, PackageX, PackageCheck, GripVertical, Share2, Link2Off, Eye, EyeOff } from 'lucide-react';
import { toast } from 'react-hot-toast';


import { shareContent } from '../../lib/share';
import { getAppBaseUrl } from '../../lib/urlHelper';

interface ProductCardProps {
  product: Product;
  onEdit: (product: Product) => void;
  onDelete: (id: string) => void;
  onSendNow?: (product: Product) => void;
  isSending?: boolean;
  onOutOfStock?: (product: Product) => void;
  onAvailable?: (product: Product) => void;
  onToggleActive?: (product: Product) => void;
  onUnlink?: (product: Product) => void;
  dragHandleProps?: any;
  isSelected?: boolean;
  onSelect?: (id: string) => void;
  shareTemplate?: string | null;
  catalogName?: string | null;
  contactNumber?: string | null;
  catalogSlug?: string | null;
  displayCurrency?: string;
  usdToCupRate?: number;
  cupToUsdRate?: number;
  ownerPlan?: string;
  appUrl?: string;
}

export const ProductCard: React.FC<ProductCardProps> = ({ 
  product, 
  onEdit, 
  onDelete, 
  onSendNow, 
  isSending,
  onOutOfStock, 
  onAvailable,
  onToggleActive,
  onUnlink,
  dragHandleProps,
  isSelected,
  onSelect,
  shareTemplate,
  catalogName,
  contactNumber,
  catalogSlug,
  displayCurrency,
  usdToCupRate,
  cupToUsdRate,
  ownerPlan,
  appUrl
}) => {
  const getDisplayPriceInfo = () => {
    const price = product.price;
    const currency = product.currency;
    if (price === null) return { priceText: 'Consultar', currencyText: '' };

    const hasDuality = ownerPlan && ownerPlan !== 'free';
    if (!hasDuality || !displayCurrency || displayCurrency === 'original') {
      return { priceText: `${price.toLocaleString()}`, currencyText: currency };
    }

    const usdToCup = Number(usdToCupRate) || 1.0;
    const cupToUsd = Number(cupToUsdRate) || 1.0;

    const pUsd = product.price_usd !== null && product.price_usd !== undefined ? product.price_usd : (currency === 'USD' ? price : price * cupToUsd);
    const pCup = product.price_cup !== null && product.price_cup !== undefined ? product.price_cup : (currency === 'CUP' ? price : price * usdToCup);

    switch (displayCurrency) {
      case 'usd':
        return { priceText: `${pUsd.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`, currencyText: 'USD' };
      case 'cup':
        return { priceText: `${pCup.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`, currencyText: 'CUP' };
      case 'both':
        return { 
          priceText: `${pUsd.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })} USD / ${pCup.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`, 
          currencyText: 'CUP' 
        };
      default:
        return { priceText: `${price.toLocaleString()}`, currencyText: currency };
    }
  };

  const renderAdminProductPrice = () => {
    const price = product.price;
    const currency = product.currency;
    if (price === null) {
      return <span className="text-accent font-bold text-xs tabular-nums mr-1">Consultar</span>;
    }

    const hasDuality = ownerPlan && ownerPlan !== 'free';
    if (!hasDuality || !displayCurrency || displayCurrency === 'original') {
      return (
        <span className="text-accent font-bold text-xs tabular-nums mr-1">
          {price.toLocaleString()} {currency}
        </span>
      );
    }

    const usdToCup = Number(usdToCupRate) || 1.0;
    const cupToUsd = Number(cupToUsdRate) || 1.0;

    const pUsd = product.price_usd !== null && product.price_usd !== undefined ? product.price_usd : (currency === 'USD' ? price : price * cupToUsd);
    const pCup = product.price_cup !== null && product.price_cup !== undefined ? product.price_cup : (currency === 'CUP' ? price : price * usdToCup);

    const formattedUsd = pUsd.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + ' USD';
    const formattedCup = pCup.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + ' CUP';

    switch (displayCurrency) {
      case 'usd':
        return <span className="text-accent font-bold text-xs tabular-nums mr-1">{formattedUsd}</span>;
      case 'cup':
        return <span className="text-accent font-bold text-xs tabular-nums mr-1">{formattedCup}</span>;
      case 'both': {
        const isPrincipalUsd = currency === 'USD';
        const principal = isPrincipalUsd ? formattedUsd : formattedCup;
        const exchange = isPrincipalUsd ? formattedCup : formattedUsd;
        return (
          <span className="text-accent font-bold text-xs tabular-nums mr-1">
            {principal}
            <span className="text-[9px] font-normal opacity-60 text-secondary ml-1">
              / {exchange}
            </span>
          </span>
        );
      }
      default:
        return (
          <span className="text-accent font-bold text-xs tabular-nums mr-1">
            {price.toLocaleString()} {currency}
          </span>
        );
    }
  };

  const handleShare = async () => {
    const { priceText, currencyText } = getDisplayPriceInfo();
    let text = '';
    if (shareTemplate) {
      const contactPhone = contactNumber || '';
      const baseUrl = appUrl || getAppBaseUrl();
      const storeUrl = catalogSlug ? `${baseUrl}/${catalogSlug}` : '';
      text = shareTemplate
        .replace(/{product_name}/g, (product.name || '').trim())
        .replace(/{product_description}/g, (product.description || '').trim())
        .replace(/{product_price}/g, priceText.trim())
        .replace(/{product_currency}/g, currencyText.trim())
        .replace(/{catalog_name}/g, (catalogName || '').trim())
        .replace(/{contact_number}/g, contactPhone)
        .replace(/{store_url}/g, storeUrl);
    } else {
      text = `*${product.name}*\n\nPrecio: ${priceText} ${currencyText}\n\n${product.description || ''}`.trim();
    }

    await shareContent({
      title: product.name,
      text: text,
      imageUrl: product.imagen_url || undefined
    });
  };

  return (
    <div className={`card group hover:border-accent/30 transition-all flex flex-col p-2 gap-1.5 relative ${product.is_out_of_stock ? 'opacity-75 grayscale-[0.5]' : ''} ${isSelected ? 'border-accent bg-accent/5 ring-1 ring-accent' : ''} ${product.is_discontinued ? 'border-red-500/40 bg-red-500/5 hover:border-red-500/60' : ''} ${!product.is_active ? 'opacity-65 border-dashed border-red-500/20 bg-red-500/5 hover:border-red-500/40' : ''}`}>
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
        {product.parent_product_id && onUnlink && (
          <button 
            onClick={() => onUnlink(product)}
            className="p-1 px-2 text-gray-500 hover:text-orange-400 hover:bg-orange-400/10 rounded-lg transition-colors text-xs flex items-center gap-1"
            title="Desvincular del catálogo origen"
            aria-label={`Desvincular producto ${product.name}`}
          >
            <Link2Off size={14} />
            <span className="hidden sm:inline">Desvincular</span>
          </button>
        )}
        <button 
          onClick={handleShare}
          className="p-1 px-2 text-gray-500 hover:text-blue-500 hover:bg-blue-500/10 rounded-lg transition-colors text-xs flex items-center gap-1"
          title="Compartir producto"
          aria-label={`Compartir producto ${product.name}`}
        >
          <Share2 size={14} />
        </button>
        {onToggleActive && (
          <button 
            onClick={() => onToggleActive(product)}
            className={`p-1 px-2 rounded-lg transition-colors text-xs flex items-center gap-1 ${
              product.is_active 
                ? 'text-gray-500 hover:text-red-500 hover:bg-red-500/10' 
                : 'text-gray-400 hover:text-emerald-500 hover:bg-emerald-500/10'
            }`}
            title={product.is_active ? "Desactivar producto" : "Activar producto"}
            aria-label={product.is_active ? `Desactivar producto ${product.name}` : `Activar producto ${product.name}`}
          >
            {product.is_active ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        )}
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
          <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
            {renderAdminProductPrice()}
            {product.parent_product_id && product.base_price !== undefined && product.base_price !== null && (
              <span className="text-secondary text-[9px] sm:text-[10px] font-semibold tabular-nums mr-1 bg-surface-hover px-1.5 py-0.5 rounded-lg border border-border/40 select-none" title="Precio original del catálogo origen">
                Orig: {product.base_price} {product.currency}
              </span>
            )}
            {product.parent_product_id && (
              <span className="text-[8px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full font-black uppercase tracking-wider">
                Importado
              </span>
            )}
            {product.is_discontinued && (
              <span className="text-[8px] bg-red-500/10 text-red-400 px-2 py-0.5 rounded-full font-black uppercase tracking-wider animate-pulse">
                Descontinuado
              </span>
            )}
            {product.is_out_of_stock && (
              <span className="text-[8px] bg-orange-500/10 text-orange-500 px-2 py-0.5 rounded-full font-black uppercase tracking-wider">
                Agotado
              </span>
            )}
            {!product.is_active && (
              <span className="text-[8px] bg-red-500/10 text-red-500 px-2 py-0.5 rounded-full font-black uppercase tracking-wider">
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

