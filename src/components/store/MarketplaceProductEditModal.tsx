import React, { useState } from 'react';
import { X, Check, DollarSign, Truck, FileText, Tag } from 'lucide-react';
import type { PublicProduct } from '../../types/store';
import { updateMarketplaceProduct } from '../../lib/marketplace';

interface MarketplaceProductEditModalProps {
  product: PublicProduct;
  isOpen: boolean;
  onClose: () => void;
  onSaved: (updated: Partial<PublicProduct>) => void;
}

export const MarketplaceProductEditModal: React.FC<MarketplaceProductEditModalProps> = ({
  product,
  isOpen,
  onClose,
  onSaved,
}) => {
  const [name, setName] = useState(product.name || '');
  const [price, setPrice] = useState<string>(product.price !== null ? String(product.price) : '');
  const [currency, setCurrency] = useState<'USD' | 'CUP'>((product.currency as 'USD' | 'CUP') || 'CUP');
  const [description, setDescription] = useState(product.description || '');
  const [deliveryCost, setDeliveryCost] = useState<string>(
    product.delivery_cost !== null && product.delivery_cost !== undefined ? String(product.delivery_cost) : ''
  );
  const [deliveryCurrency, setDeliveryCurrency] = useState<'USD' | 'CUP'>(
    (product.delivery_currency as 'USD' | 'CUP') || 'CUP'
  );
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('El nombre es requerido');
      return;
    }
    setSaving(true);
    setErrorMsg(null);

    const parsedPrice = price.trim() !== '' ? parseFloat(price) : null;
    const parsedDelivery = deliveryCost.trim() !== '' ? parseFloat(deliveryCost) : null;

    const success = await updateMarketplaceProduct({
      productId: product.id,
      name: name.trim(),
      price: parsedPrice,
      currency,
      description: description.trim() || null,
      deliveryCost: parsedDelivery,
      deliveryCurrency,
    });

    setSaving(false);
    if (success) {
      onSaved({
        name: name.trim(),
        price: parsedPrice,
        currency,
        description: description.trim() || null,
        delivery_cost: parsedDelivery,
        delivery_currency: deliveryCurrency,
      });
      onClose();
    } else {
      setErrorMsg('No se pudo guardar los cambios. Verifica que hayas iniciado sesión con el mismo número de WhatsApp.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-store-fade-up">
      <div
        className="w-full max-w-md bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Cabecera */}
        <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-surface-hover/30">
          <div>
            <h3 className="font-display font-bold text-base text-primary flex items-center gap-2">
              <Tag size={16} className="text-accent" />
              Editar tu publicación
            </h3>
            <p className="text-xs text-secondary">
              Cambia el precio, descripción o costo de entrega en el catálogo Nazaar.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-secondary hover:text-primary hover:bg-surface-hover transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
          {errorMsg && (
            <div className="p-3 text-xs rounded-xl bg-red-500/15 border border-red-500/30 text-red-500">
              {errorMsg}
            </div>
          )}

          {/* Nombre */}
          <div>
            <label className="block text-xs font-semibold text-secondary mb-1">Título del Producto</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border focus:border-accent text-sm text-primary outline-none transition-colors"
            />
          </div>

          {/* Precio y Moneda */}
          <div>
            <label className="block text-xs font-semibold text-secondary mb-1 flex items-center gap-1.5">
              <DollarSign size={13} className="text-accent" />
              Precio
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                step="any"
                min="0"
                value={price}
                onChange={e => setPrice(e.target.value)}
                placeholder="0.00"
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-background border border-border focus:border-accent text-sm text-primary outline-none transition-colors"
              />
              <select
                value={currency}
                onChange={e => setCurrency(e.target.value as 'USD' | 'CUP')}
                className="px-3 py-2.5 rounded-xl bg-background border border-border focus:border-accent text-sm font-semibold text-primary outline-none"
              >
                <option value="CUP">CUP</option>
                <option value="USD">USD</option>
              </select>
            </div>
          </div>

          {/* Domicilio */}
          <div>
            <label className="block text-xs font-semibold text-secondary mb-1 flex items-center gap-1.5">
              <Truck size={13} className="text-accent" />
              Costo de Domicilio (opcional, 0 = Gratis)
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                step="any"
                min="0"
                value={deliveryCost}
                onChange={e => setDeliveryCost(e.target.value)}
                placeholder="0 (Gratis)"
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-background border border-border focus:border-accent text-sm text-primary outline-none transition-colors"
              />
              <select
                value={deliveryCurrency}
                onChange={e => setDeliveryCurrency(e.target.value as 'USD' | 'CUP')}
                className="px-3 py-2.5 rounded-xl bg-background border border-border focus:border-accent text-sm font-semibold text-primary outline-none"
              >
                <option value="CUP">CUP</option>
                <option value="USD">USD</option>
              </select>
            </div>
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-xs font-semibold text-secondary mb-1 flex items-center gap-1.5">
              <FileText size={13} className="text-accent" />
              Descripción
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Detalles del producto, estado, características..."
              className="w-full px-3.5 py-2 rounded-xl bg-background border border-border focus:border-accent text-sm text-primary outline-none transition-colors resize-none"
            />
          </div>

          {/* Botones de acción */}
          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-secondary hover:text-primary hover:bg-surface-hover transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-xl bg-accent hover:bg-accent-hover text-accent-text text-xs font-bold flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
            >
              <Check size={14} />
              {saving ? 'Guardando…' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
