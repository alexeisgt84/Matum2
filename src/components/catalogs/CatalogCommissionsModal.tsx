import React, { useEffect, useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useCommissions } from '../../hooks/useCommissions';
import type { Commission, CommissionStatus } from '../../types/commission';
import { 
  Coins, 
  Check, 
  X, 
  Clock, 
  CheckCircle2, 
  DollarSign, 
  User, 
  Phone, 
  CreditCard,
  AlertCircle
} from 'lucide-react';
import { toast } from 'react-hot-toast';

interface CatalogCommissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  catalogId: string;
  catalogName: string;
}

export const CatalogCommissionsModal: React.FC<CatalogCommissionsModalProps> = ({
  isOpen,
  onClose,
  catalogId,
  catalogName,
}) => {
  const { commissions, loading, getCatalogCommissions, updateCommissionStatus } = useCommissions();
  const [filter, setFilter] = useState<'all' | CommissionStatus>('all');
  const [selectedCommission, setSelectedCommission] = useState<Commission | null>(null);

  useEffect(() => {
    if (isOpen && catalogId) {
      getCatalogCommissions(catalogId);
    }
  }, [isOpen, catalogId, getCatalogCommissions]);

  if (!isOpen) return null;

  const filteredCommissions = commissions.filter((c) => {
    if (filter === 'all') return true;
    return c.status === filter;
  });

  const pendingCup = commissions
    .filter((c) => c.status === 'pending' || c.status === 'approved')
    .reduce((sum, c) => sum + Number(c.commission_cup ?? (c.currency === 'CUP' ? c.commission_total : 0)), 0);

  const pendingUsd = commissions
    .filter((c) => c.status === 'pending' || c.status === 'approved')
    .reduce((sum, c) => sum + Number(c.commission_usd ?? (c.currency === 'USD' ? c.commission_total : 0)), 0);

  const paidCup = commissions
    .filter((c) => c.status === 'paid')
    .reduce((sum, c) => sum + Number(c.commission_cup ?? (c.currency === 'CUP' ? c.commission_total : 0)), 0);

  const paidUsd = commissions
    .filter((c) => c.status === 'paid')
    .reduce((sum, c) => sum + Number(c.commission_usd ?? (c.currency === 'USD' ? c.commission_total : 0)), 0);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Comisiones: ${catalogName}`}>
      <div className="space-y-4 max-h-[80vh] flex flex-col font-poppins">
        
        {/* Resumen Superior Dual */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl">
            <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider block">
              Por Pagar (Pendientes)
            </span>
            <div className="mt-1 space-y-0.5">
              <span className="text-base sm:text-lg font-black text-amber-500 block leading-tight">
                {pendingCup.toLocaleString()} CUP
              </span>
              {pendingUsd > 0 && (
                <span className="text-xs font-black text-amber-400 block leading-tight">
                  ${pendingUsd.toFixed(2)} USD
                </span>
              )}
            </div>
          </div>

          <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl">
            <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider block">
              Total Ya Pagado
            </span>
            <div className="mt-1 space-y-0.5">
              <span className="text-base sm:text-lg font-black text-emerald-500 block leading-tight">
                {paidCup.toLocaleString()} CUP
              </span>
              {paidUsd > 0 && (
                <span className="text-xs font-black text-emerald-400 block leading-tight">
                  ${paidUsd.toFixed(2)} USD
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Filtros de Estado */}
        <div className="flex gap-1.5 p-1 bg-surface-hover rounded-xl border border-border text-xs overflow-x-auto">
          {(['all', 'pending', 'approved', 'paid', 'cancelled'] as const).map((tab) => {
            const labels: Record<string, string> = {
              all: 'Todas',
              pending: 'Pendientes',
              approved: 'Aprobadas',
              paid: 'Pagadas',
              cancelled: 'Canceladas',
            };
            const isActive = filter === tab;
            return (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`flex-1 py-1.5 px-2.5 rounded-lg font-bold text-[11px] whitespace-nowrap transition-all ${
                  isActive ? 'bg-accent text-accent-foreground shadow-sm' : 'text-secondary hover:text-primary'
                }`}
              >
                {labels[tab]}
              </button>
            );
          })}
        </div>

        {/* Lista de Comisiones */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 min-h-[220px]">
          {loading ? (
            <div className="text-center py-10 text-secondary text-xs animate-pulse">
              Cargando comisiones del catálogo...
            </div>
          ) : filteredCommissions.length === 0 ? (
            <div className="text-center py-12 text-secondary space-y-1">
              <Coins size={28} className="mx-auto text-secondary/40 mb-2" />
              <p className="text-xs font-bold">No hay registros con este filtro</p>
              <p className="text-[11px] text-secondary/70">
                Las comisiones aparecerán automáticamente cuando los clientes compren con enlaces de promotores.
              </p>
            </div>
          ) : (
            filteredCommissions.map((item) => {
              const statusBadge: Record<CommissionStatus, { label: string; cls: string }> = {
                pending: { label: 'Pendiente', cls: 'bg-amber-500/10 text-amber-500 border-amber-500/30' },
                approved: { label: 'Aprobada', cls: 'bg-blue-500/10 text-blue-500 border-blue-500/30' },
                paid: { label: 'Pagada', cls: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' },
                cancelled: { label: 'Cancelada', cls: 'bg-rose-500/10 text-rose-500 border-rose-500/30' },
              };
              const badge = statusBadge[item.status] || statusBadge.pending;
              const payout = item.affiliate?.payout_info;

              return (
                <div
                  key={item.id}
                  className="card p-3 rounded-xl border border-border/80 bg-surface space-y-2 hover:border-border transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-primary flex items-center gap-1">
                          <User size={13} className="text-accent" />
                          {item.affiliate?.full_name || 'Promotor'}
                        </span>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${badge.cls}`}>
                          {badge.label}
                        </span>
                      </div>
                      <p className="text-[11px] text-secondary mt-0.5">
                        Ref. Pedido: <span className="font-mono font-bold text-primary">{item.order_ref || 'N/A'}</span>
                      </p>
                      {item.affiliate?.phone && (
                        <p className="text-[10px] text-secondary flex items-center gap-1 mt-0.5">
                          <Phone size={10} /> {item.affiliate.phone}
                        </p>
                      )}
                    </div>

                    <div className="text-right">
                      <span className="text-sm font-black text-accent block">
                        {item.commission_cup && item.commission_cup > 0 ? `+${item.commission_cup} CUP` : ''}
                        {item.commission_cup && item.commission_cup > 0 && item.commission_usd && item.commission_usd > 0 ? ' • ' : ''}
                        {item.commission_usd && item.commission_usd > 0 ? `+${item.commission_usd} USD` : ''}
                        {(!item.commission_cup && !item.commission_usd) ? `+${item.commission_total} ${item.currency}` : ''}
                      </span>
                      <span className="text-[10px] text-secondary">
                        Venta: ${item.sale_total} {item.currency}
                      </span>
                    </div>
                  </div>

                  {/* Datos de cobro del promotor si existen */}
                  {payout?.account && (
                    <div className="text-[11px] bg-surface-hover/80 p-2 rounded-lg border border-border/50 text-secondary space-y-0.5">
                      <div className="flex items-center gap-1 font-bold text-primary text-[10px] uppercase tracking-wider">
                        <CreditCard size={11} className="text-accent" /> Datos de Pago:
                      </div>
                      <p><span className="text-secondary/70">Método:</span> {payout.method || 'Transferencia'}</p>
                      <p><span className="text-secondary/70">Cuenta/Tarjeta:</span> <span className="font-mono font-bold text-primary">{payout.account}</span></p>
                      {payout.notes && <p><span className="text-secondary/70">Notas:</span> {payout.notes}</p>}
                    </div>
                  )}

                  {/* Acciones para el dueño del catálogo */}
                  <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-border/40">
                    {item.status === 'pending' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => updateCommissionStatus(item.id, 'approved')}
                        className="text-[11px] h-7 px-2 font-bold text-blue-500 hover:bg-blue-500/10"
                      >
                        Aprobar Venta
                      </Button>
                    )}

                    {(item.status === 'pending' || item.status === 'approved') && (
                      <Button
                        size="sm"
                        onClick={() => updateCommissionStatus(item.id, 'paid')}
                        className="text-[11px] h-7 px-2.5 font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        <Check size={12} className="mr-1" /> Marcar Pagada
                      </Button>
                    )}

                    {item.status !== 'cancelled' && item.status !== 'paid' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => updateCommissionStatus(item.id, 'cancelled')}
                        className="text-[11px] h-7 px-2 font-bold text-rose-500 hover:bg-rose-500/10"
                      >
                        Cancelar
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="pt-2 flex justify-end">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
    </Modal>
  );
};
