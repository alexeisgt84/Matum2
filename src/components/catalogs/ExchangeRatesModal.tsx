import React, { useState, useEffect } from 'react';
import { BottomSheet } from '../ui/BottomSheet';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { DollarSign, Coins } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface ExchangeRatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialUsdToCup: number;
  initialCupToUsd: number;
  onSave: (usdToCup: number, cupToUsd: number) => Promise<void>;
}

export const ExchangeRatesModal: React.FC<ExchangeRatesModalProps> = ({
  isOpen,
  onClose,
  initialUsdToCup,
  initialCupToUsd,
  onSave,
}) => {
  const [usdToCup, setUsdToCup] = useState<number>(1.0);
  const [cupToUsd, setCupToUsd] = useState<number>(1.0);
  const [saving, setSaving] = useState(false);

  // Sync state when modal opens
  useEffect(() => {
    if (isOpen) {
      setUsdToCup(initialUsdToCup || 1.0);
      setCupToUsd(initialCupToUsd || 1.0);
    }
  }, [isOpen, initialUsdToCup, initialCupToUsd]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(usdToCup, cupToUsd);
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error('Error al guardar las tasas de cambio');
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Actualizar Tasas de Cambio">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <p className="text-xs text-secondary leading-relaxed uppercase tracking-wider">
            Define las tasas de cambio del catálogo para las conversiones automáticas en la tienda pública.
          </p>

          <Input
            label="Precio de Venta del Dólar (USD en CUP)"
            type="number"
            step="0.01"
            placeholder="Ej: 600.00"
            value={usdToCup}
            onChange={(e) => setUsdToCup(Number(e.target.value) || 1.0)}
            icon={DollarSign}
            helperText="Precio en CUP al que vendes el dólar. Usado cuando un producto en USD se muestra en CUP."
            required
          />

          <Input
            label="Precio de Compra del Dólar (USD en CUP)"
            type="number"
            step="1"
            placeholder="Ej: 580"
            value={cupToUsd > 0 ? Math.round(1 / cupToUsd) : ''}
            onChange={(e) => {
              const val = Number(e.target.value) || 0;
              setCupToUsd(val > 0 ? 1 / val : 1.0);
            }}
            icon={DollarSign}
            helperText="Precio en CUP al que compras el dólar. Usado cuando un producto en CUP se muestra en USD."
            required
          />
        </div>

        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="secondary"
            className="flex-1 py-3.5 font-bold"
            onClick={onClose}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            className="flex-1 py-3.5 font-bold"
            loading={saving}
            icon={Coins}
          >
            Guardar Tasas
          </Button>
        </div>
      </form>
    </BottomSheet>
  );
};
