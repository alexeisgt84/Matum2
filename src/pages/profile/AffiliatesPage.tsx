import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/ui/PageHeader';
import { useAuthStore } from '../../store/authStore';
import { useCommissions } from '../../hooks/useCommissions';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { 
  Coins, 
  Copy, 
  Check, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  DollarSign, 
  Share2, 
  CreditCard,
  Building2,
  Phone
} from 'lucide-react';
import { toast } from 'react-hot-toast';

export const AffiliatesPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, loadUser } = useAuthStore();
  const { commissions, loading, getMyCommissions } = useCommissions();

  const [copied, setCopied] = useState(false);
  const [editingPayout, setEditingPayout] = useState(false);
  const [payoutMethod, setPayoutMethod] = useState('');
  const [payoutAccount, setPayoutAccount] = useState('');
  const [payoutPhone, setPayoutPhone] = useState('');
  const [payoutNotes, setPayoutNotes] = useState('');
  const [savingPayout, setSavingPayout] = useState(false);

  useEffect(() => {
    getMyCommissions();
    if (user?.payout_info) {
      setPayoutMethod(user.payout_info.method || '');
      setPayoutAccount(user.payout_info.account || '');
      setPayoutPhone(user.payout_info.phone || user.phone || '');
      setPayoutNotes(user.payout_info.notes || '');
    } else if (user?.phone) {
      setPayoutPhone(user.phone);
    }
  }, [getMyCommissions, user]);

  const referralCode = user?.referral_code || 'ref_' + (user?.id ? user.id.substring(0, 6) : '');
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://matum.vercel.app';
  const referralDemoLink = `${baseUrl}/?ref=${referralCode}`;

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(referralCode);
      setCopied(true);
      toast.success('¡Código de referido copiado!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('No se pudo copiar');
    }
  };

  const handleSavePayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSavingPayout(true);
    try {
      const payout_info = {
        method: payoutMethod,
        account: payoutAccount,
        phone: payoutPhone,
        notes: payoutNotes,
      };

      // Verificar y refrescar sesión si es necesario
      let { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        const { data: refreshed } = await supabase.auth.refreshSession();
        if (refreshed?.session?.user) {
          session = refreshed.session;
        }
      }

      const activeUserId = session?.user?.id || user.id;

      const { error } = await supabase
        .from('users')
        .update({ payout_info })
        .eq('id', activeUserId);

      if (error) {
        if (error.code === '42501' || error.message?.toLowerCase().includes('row-level')) {
          toast.error('Tu sesión ha expirado o no tienes permisos para guardar estos datos. Inicia sesión nuevamente.');
          return;
        }
        throw error;
      }
      await loadUser();
      toast.success('Datos de cobro guardados correctamente');
      setEditingPayout(false);
    } catch (err: any) {
      const msg = err.message || '';
      if (msg.toLowerCase().includes('row-level')) {
        toast.error('Tu sesión ha expirado o no tienes permisos. Por favor inicia sesión nuevamente.');
      } else {
        toast.error('Error al guardar datos: ' + msg);
      }
    } finally {
      setSavingPayout(false);
    }
  };

  // Cálculo de estadísticas duales (CUP y USD)
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

  const totalSalesCount = commissions.filter((c) => c.status !== 'cancelled').length;

  return (
    <div className="min-h-screen bg-background text-primary pb-24">
      <PageHeader 
        title="Mis Ganancias y Referidos" 
        onBack={() => navigate('/profile')} 
      />

      <div className="max-w-xl mx-auto px-4 py-4 space-y-6">
        
        {/* Banner de Código Único */}
        <div className="card bg-gradient-to-br from-accent/20 via-surface to-surface border border-accent/30 p-5 rounded-2xl relative overflow-hidden">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-accent flex items-center gap-1.5">
                <Share2 size={13} /> Tu Código de Promotor
              </span>
              <h2 className="text-2xl font-black tracking-tight mt-1 text-primary">
                {referralCode}
              </h2>
              <p className="text-xs text-secondary mt-1 max-w-xs leading-relaxed">
                Cuando compartas un catálogo o producto, tus enlaces incluirán tu código automáticamente.
              </p>
            </div>
            <button
              onClick={handleCopyCode}
              className="p-3 bg-accent text-accent-foreground rounded-xl shadow-md hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-1.5 text-xs font-bold"
            >
              {copied ? <Check size={18} /> : <Copy size={18} />}
              <span className="hidden sm:inline">{copied ? 'Copiado' : 'Copiar'}</span>
            </button>
          </div>
        </div>

        {/* Resumen de Métricas Duales */}
        <div className="grid grid-cols-3 gap-3">
          <div className="card p-3.5 rounded-2xl border border-border flex flex-col justify-between">
            <span className="text-[10px] uppercase font-bold text-secondary tracking-wider flex items-center gap-1">
              <Clock size={12} className="text-amber-500" /> Pendiente
            </span>
            <div className="mt-2 space-y-0.5">
              <span className="text-sm sm:text-base font-black text-amber-500 block leading-tight">
                {pendingCup.toLocaleString()} CUP
              </span>
              {pendingUsd > 0 && (
                <span className="text-xs font-black text-amber-400 block leading-tight">
                  ${pendingUsd.toFixed(2)} USD
                </span>
              )}
            </div>
          </div>

          <div className="card p-3.5 rounded-2xl border border-border flex flex-col justify-between">
            <span className="text-[10px] uppercase font-bold text-secondary tracking-wider flex items-center gap-1">
              <CheckCircle2 size={12} className="text-emerald-500" /> Cobrado
            </span>
            <div className="mt-2 space-y-0.5">
              <span className="text-sm sm:text-base font-black text-emerald-500 block leading-tight">
                {paidCup.toLocaleString()} CUP
              </span>
              {paidUsd > 0 && (
                <span className="text-xs font-black text-emerald-400 block leading-tight">
                  ${paidUsd.toFixed(2)} USD
                </span>
              )}
            </div>
          </div>

          <div className="card p-3.5 rounded-2xl border border-border flex flex-col justify-between">
            <span className="text-[10px] uppercase font-bold text-secondary tracking-wider flex items-center gap-1">
              <Coins size={12} className="text-accent" /> Ventas
            </span>
            <div className="mt-2">
              <span className="text-lg font-black text-primary">{totalSalesCount}</span>
            </div>
          </div>
        </div>

        {/* Sección: Datos de Cobro */}
        <div className="card p-4 rounded-2xl border border-border space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard size={16} className="text-accent" />
              <h3 className="font-bold text-xs uppercase tracking-wider">Tus Datos para Recibir Pagos</h3>
            </div>
            {!editingPayout && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditingPayout(true)}
                className="text-xs font-bold text-accent h-7 px-2"
              >
                Editar
              </Button>
            )}
          </div>

          {editingPayout ? (
            <form onSubmit={handleSavePayout} className="space-y-3 pt-2">
              <div>
                <label className="text-[10px] font-bold text-secondary uppercase tracking-wider block mb-1">
                  Método de Pago (ej. Transfermóvil, EnZona, Tarjeta CUP / MLC, Zelle)
                </label>
                <Input
                  value={payoutMethod}
                  onChange={(e) => setPayoutMethod(e.target.value)}
                  placeholder="Ej: Transfermóvil / Tarjeta CUP"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-secondary uppercase tracking-wider block mb-1">
                  Número de Cuenta o Tarjeta
                </label>
                <Input
                  value={payoutAccount}
                  onChange={(e) => setPayoutAccount(e.target.value)}
                  placeholder="Número de tarjeta o cuenta bancaria"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-secondary uppercase tracking-wider block mb-1">
                  Teléfono / Móvil asociado
                </label>
                <Input
                  value={payoutPhone}
                  onChange={(e) => setPayoutPhone(e.target.value)}
                  placeholder="Número telefónico"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-secondary uppercase tracking-wider block mb-1">
                  Notas adicionales para el vendedor
                </label>
                <Input
                  value={payoutNotes}
                  onChange={(e) => setPayoutNotes(e.target.value)}
                  placeholder="Ej: Titular: Nombre Completo"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingPayout(false)}
                  disabled={savingPayout}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={savingPayout}
                >
                  {savingPayout ? 'Guardando...' : 'Guardar Datos'}
                </Button>
              </div>
            </form>
          ) : (
            <div className="text-xs bg-surface-hover/60 p-3 rounded-xl border border-border/50 space-y-1">
              {payoutAccount ? (
                <>
                  <p><strong className="text-secondary">Método:</strong> {payoutMethod || 'No especificado'}</p>
                  <p><strong className="text-secondary">Cuenta/Tarjeta:</strong> {payoutAccount}</p>
                  {payoutPhone && <p><strong className="text-secondary">Teléfono:</strong> {payoutPhone}</p>}
                  {payoutNotes && <p><strong className="text-secondary">Notas:</strong> {payoutNotes}</p>}
                </>
              ) : (
                <p className="text-secondary italic">
                  Aún no has configurado tus datos de cobro. Haz clic en "Editar" para que los dueños de catálogos sepan dónde pagarte.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Lista de Comisiones */}
        <div className="space-y-3">
          <h3 className="font-bold text-xs uppercase tracking-wider text-secondary ml-1">
            Historial de Comisiones Generadas
          </h3>

          {loading ? (
            <div className="text-center py-8 text-secondary text-xs animate-pulse">
              Cargando comisiones...
            </div>
          ) : commissions.length === 0 ? (
            <div className="card p-8 text-center rounded-2xl border border-dashed border-border">
              <Coins size={32} className="mx-auto text-secondary/40 mb-2" />
              <p className="font-bold text-sm text-secondary">Aún no tienes ventas referidas</p>
              <p className="text-xs text-secondary/70 mt-1">
                Comparte productos de cualquier tienda activa en Matum para empezar a ganar comisiones.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {commissions.map((comm) => {
                const statusStyles: Record<string, { label: string; bg: string; text: string }> = {
                  pending: { label: 'Pendiente', bg: 'bg-amber-500/10 border-amber-500/30', text: 'text-amber-500' },
                  approved: { label: 'Aprobada', bg: 'bg-blue-500/10 border-blue-500/30', text: 'text-blue-500' },
                  paid: { label: 'Pagada', bg: 'bg-emerald-500/10 border-emerald-500/30', text: 'text-emerald-500' },
                  cancelled: { label: 'Cancelada', bg: 'bg-rose-500/10 border-rose-500/30', text: 'text-rose-500' },
                };
                const style = statusStyles[comm.status] || statusStyles.pending;

                return (
                  <div key={comm.id} className="card p-3.5 rounded-xl border border-border flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs truncate">
                          {comm.catalog?.name || 'Catálogo'}
                        </span>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${style.bg} ${style.text}`}>
                          {style.label}
                        </span>
                      </div>
                      <p className="text-[11px] text-secondary mt-0.5">
                        Ref: {comm.order_ref || 'Pedido'} • Venta: ${comm.sale_total} {comm.currency}
                      </p>
                      <p className="text-[10px] text-secondary/60">
                        {new Date(comm.created_at).toLocaleDateString()} {new Date(comm.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <span className="text-sm font-black text-accent block">
                        {comm.commission_cup && comm.commission_cup > 0 ? `+${comm.commission_cup} CUP` : ''}
                        {comm.commission_cup && comm.commission_cup > 0 && comm.commission_usd && comm.commission_usd > 0 ? ' • ' : ''}
                        {comm.commission_usd && comm.commission_usd > 0 ? `+${comm.commission_usd} USD` : ''}
                        {(!comm.commission_cup && !comm.commission_usd) ? `+${comm.commission_total} ${comm.currency}` : ''}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
