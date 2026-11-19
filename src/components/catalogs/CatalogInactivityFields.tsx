import React from 'react';
import { Clock, MessageSquareText, X } from 'lucide-react';

interface CatalogInactivityFieldsProps {
  inactiveReason: string;
  reopenAt: string;
  onReasonChange: (value: string) => void;
  onReopenAtChange: (isoValue: string) => void;
}

const toLocalDateTimeInput = (isoString: string): string => {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '';
  const offsetMs = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
};

const fromLocalDateTimeInput = (localValue: string): string => {
  if (!localValue) return '';
  const date = new Date(localValue);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString();
};

export const CatalogInactivityFields: React.FC<CatalogInactivityFieldsProps> = ({
  inactiveReason,
  reopenAt,
  onReasonChange,
  onReopenAtChange,
}) => {
  const localInputValue = toLocalDateTimeInput(reopenAt);
  const minDateTime = toLocalDateTimeInput(new Date().toISOString());

  return (
    <div className="space-y-4 rounded-2xl border border-amber-500/25 bg-amber-500/[0.04] p-4 animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex items-start gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
          <Clock size={14} />
        </div>
        <div>
          <p className="text-xs font-bold text-primary">Aviso de pausa para tus clientes</p>
          <p className="text-[11px] text-secondary leading-relaxed">
            Si tu catálogo es público, los visitantes verán una pantalla minimalista con este mensaje y la cuenta regresiva.
          </p>
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-[11px] font-semibold text-secondary uppercase tracking-wider flex items-center gap-1.5">
          <MessageSquareText size={12} className="text-amber-400" />
          Causa de la inactividad
        </label>
        <textarea
          rows={3}
          maxLength={280}
          placeholder="Ej: Estamos actualizando inventario y precios de temporada. ¡Volvemos muy pronto!"
          value={inactiveReason}
          onChange={(e) => onReasonChange(e.target.value)}
          className="w-full rounded-xl bg-surface border border-border/60 px-3.5 py-2.5 text-sm text-primary placeholder:text-secondary/50 focus:outline-none focus:border-amber-500/60 transition-colors resize-none"
        />
        <div className="flex justify-end">
          <span className="text-[10px] text-secondary/70 tabular-nums">
            {inactiveReason.length}/280
          </span>
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-semibold text-secondary uppercase tracking-wider flex items-center gap-1.5">
            <Clock size={12} className="text-amber-400" />
            Fecha y hora de reapertura (opcional)
          </label>
          {localInputValue && (
            <button
              type="button"
              onClick={() => onReopenAtChange('')}
              className="text-[11px] text-secondary hover:text-primary flex items-center gap-1 transition-colors"
            >
              <X size={12} /> Limpiar
            </button>
          )}
        </div>
        <input
          type="datetime-local"
          min={minDateTime}
          value={localInputValue}
          onChange={(e) => onReopenAtChange(fromLocalDateTimeInput(e.target.value))}
          className="w-full rounded-xl bg-surface border border-border/60 px-3.5 py-2.5 text-sm text-primary focus:outline-none focus:border-amber-500/60 transition-colors"
        />
        <p className="text-[10px] text-secondary/80">
          Se mostrará una cuenta regresiva en vivo hasta esta fecha y hora.
        </p>
      </div>
    </div>
  );
};
