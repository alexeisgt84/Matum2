import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { usePlanStore } from '../../store/planStore';
import { useSubscriptionStore } from '../../store/subscriptionStore';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { 
  Check, 
  X, 
  ArrowLeft, 
  User, 
  Phone, 
  Calendar, 
  DollarSign, 
  Image as ImageIcon,
  ExternalLink,
  MessageSquare,
  AlertCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';

export const PaymentsPage = () => {
  const { user: adminUser } = useAuthStore();
  const { plans, getPlans } = usePlanStore();
  const { 
    pendingTransactions, 
    loading, 
    fetchPendingTransactions, 
    approveTransaction, 
    rejectTransaction 
  } = useSubscriptionStore();

  const navigate = useNavigate();
  const [selectedReceiptUrl, setSelectedReceiptUrl] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    getPlans();
    fetchPendingTransactions();
  }, [getPlans, fetchPendingTransactions]);

  const handleApprove = async (transactionId: string) => {
    if (!adminUser?.id) return;
    if (!confirm('¿Estás seguro de aprobar este pago? Esto activará la suscripción del usuario.')) return;

    setProcessingId(transactionId);
    toast.loading('Aprobando pago...', { id: 'approve' });
    
    try {
      await approveTransaction(transactionId, adminUser.id);
      toast.success('Pago aprobado y suscripción activada correctamente ✨', { id: 'approve', duration: 4000 });
    } catch (err: any) {
      toast.error(`Error al aprobar: ${err.message || 'Error desconocido'}`, { id: 'approve' });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminUser?.id || !rejectingId || !rejectReason.trim()) return;

    setProcessingId(rejectingId);
    toast.loading('Rechazando pago...', { id: 'reject' });

    try {
      await rejectTransaction(rejectingId, adminUser.id, rejectReason);
      toast.success('Pago rechazado con éxito', { id: 'reject' });
      setRejectingId(null);
      setRejectReason('');
    } catch (err: any) {
      toast.error(`Error al rechazar: ${err.message || 'Error desconocido'}`, { id: 'reject' });
    } finally {
      setProcessingId(null);
    }
  };

  const getBillingCycleText = (cycle: string) => {
    switch (cycle) {
      case 'semesterly': return 'Semestral';
      case 'annually': return 'Anual';
      default: return 'Mensual';
    }
  };

  return (
    <div className="p-4 max-w-lg mx-auto pb-24 space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-2">
        <button 
          onClick={() => navigate('/admin')}
          className="p-2 hover:bg-surface-hover rounded-xl text-secondary hover:text-primary transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <PageHeader 
          title="Validar Pagos" 
          subtitle="Comprobantes Pendientes"
        />
      </div>

      {loading && pendingTransactions.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-secondary space-y-2">
          <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
          <span className="text-xs">Cargando pagos pendientes...</span>
        </div>
      ) : (
        <div className="space-y-4">
          {pendingTransactions.length === 0 ? (
            <div className="card p-8 text-center space-y-3 border-dashed border-border flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <Check size={24} />
              </div>
              <p className="text-secondary text-sm font-medium">No hay pagos pendientes de revisión</p>
              <Button 
                variant="secondary" 
                size="sm" 
                onClick={fetchPendingTransactions}
              >
                Actualizar Lista
              </Button>
            </div>
          ) : (
            pendingTransactions.map((t) => {
              const requestedPlan = plans.find(p => p.id === t.plan_id);
              const isProcessing = processingId === t.id;
              const isRejectingThis = rejectingId === t.id;
              
              // Datos del usuario unidos (joined)
              const userProfile = (t as any).users;
              const userDisplayName = userProfile?.full_name || 'Usuario desconocido';
              const userPhone = userProfile?.phone || 'N/A';

              return (
                <div key={t.id} className="card p-5 border-border hover:border-accent/10 transition-colors flex flex-col gap-4">
                  {/* Fila superior: Usuario e información general */}
                  <div className="flex justify-between items-start gap-4">
                    <div className="space-y-1">
                      <h4 className="font-extrabold text-primary text-sm flex items-center gap-1.5">
                        <User size={14} className="text-accent" />
                        {userDisplayName}
                      </h4>
                      <p className="text-[10px] text-secondary flex items-center gap-1">
                        <Phone size={10} />
                        {userPhone}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-black text-primary px-2.5 py-1 rounded-lg bg-surface-hover border border-border">
                        Plan {requestedPlan?.name || t.plan_id}
                      </span>
                      <p className="text-[9px] text-secondary uppercase font-bold tracking-wider mt-1.5">
                        {getBillingCycleText(t.billing_cycle)}
                      </p>
                    </div>
                  </div>

                  {/* Detalles del pago */}
                  <div className="bg-surface-hover/40 p-3 rounded-xl border border-border/50 grid grid-cols-2 gap-3 text-[11px] text-secondary">
                    <div className="space-y-0.5">
                      <span className="block font-bold">Monto a Validar</span>
                      <strong className="text-primary text-sm font-black">${t.amount} {t.currency}</strong>
                    </div>
                    <div className="space-y-0.5 text-right">
                      <span className="block font-bold">Referencia</span>
                      <strong className="text-primary text-xs font-mono">{t.transaction_reference || 'N/A'}</strong>
                    </div>
                    <div className="col-span-2 space-y-0.5 border-t border-border/30 pt-1.5 flex justify-between items-center">
                      <span>Reportado el:</span>
                      <strong className="text-primary">{format(new Date(t.created_at || ''), 'dd/MM/yyyy HH:mm')}</strong>
                    </div>
                  </div>

                  {/* Imagen del comprobante */}
                  {t.receipt_url && (
                    <div className="relative group rounded-xl overflow-hidden border border-border/60 bg-background max-h-32 flex items-center justify-center">
                      <img 
                        src={t.receipt_url} 
                        alt="Comprobante de pago" 
                        className="max-h-32 object-contain w-full cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => setSelectedReceiptUrl(t.receipt_url || null)}
                      />
                      <button 
                        onClick={() => setSelectedReceiptUrl(t.receipt_url || null)}
                        className="absolute bottom-2 right-2 bg-black/70 hover:bg-black/90 p-1.5 rounded-lg text-white transition-colors"
                        title="Ver pantalla completa"
                      >
                        <ExternalLink size={12} />
                      </button>
                    </div>
                  )}

                  {/* Formulario de rechazo inline */}
                  {isRejectingThis && (
                    <form onSubmit={handleReject} className="border-t border-danger/10 pt-3 space-y-3 animate-in slide-in-from-top duration-200">
                      <div className="flex items-center gap-1.5 text-xs text-red-400 font-bold">
                        <AlertCircle size={14} />
                        <span>Indicar Motivo de Rechazo</span>
                      </div>
                      <textarea
                        className="w-full bg-surface-hover border border-danger/30 focus:border-danger outline-none rounded-xl p-3 text-xs text-primary placeholder-secondary"
                        placeholder="Ej. El ID de transacción no coincide con el saldo de hoy."
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        required
                        rows={2}
                      />
                      <div className="flex gap-2">
                        <Button 
                          type="submit" 
                          variant="danger" 
                          size="sm" 
                          className="flex-1"
                          disabled={!rejectReason.trim() || isProcessing}
                          loading={isProcessing}
                        >
                          Confirmar Rechazo
                        </Button>
                        <Button 
                          type="button" 
                          variant="secondary" 
                          size="sm"
                          onClick={() => {
                            setRejectingId(null);
                            setRejectReason('');
                          }}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </form>
                  )}

                  {/* Acciones principales (Ocultar si se está rechazando) */}
                  {!isRejectingThis && (
                    <div className="flex gap-2 border-t border-border/50 pt-3">
                      <Button
                        variant="primary"
                        size="sm"
                        className="flex-1 bg-emerald-600 hover:bg-emerald-500 border-none text-white rounded-xl font-bold py-2.5"
                        icon={Check}
                        onClick={() => handleApprove(t.id)}
                        disabled={isProcessing}
                        loading={isProcessing}
                      >
                        Aprobar Pago
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="text-red-400 hover:text-red-300 border-red-500/20 hover:border-red-500/30 rounded-xl"
                        icon={X}
                        onClick={() => setRejectingId(t.id)}
                        disabled={isProcessing}
                      >
                        Rechazar
                      </Button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Visor de comprobante en pantalla completa */}
      {selectedReceiptUrl && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4 animate-in fade-in duration-300"
          onClick={() => setSelectedReceiptUrl(null)}
        >
          <button 
            onClick={() => setSelectedReceiptUrl(null)}
            className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 p-2.5 rounded-full text-white transition-colors"
          >
            <X size={24} />
          </button>
          
          <img 
            src={selectedReceiptUrl} 
            alt="Receipt fullscreen" 
            className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl" 
            onClick={(e) => e.stopPropagation()} 
          />
          
          <a 
            href={selectedReceiptUrl} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="mt-4 text-xs font-bold text-accent flex items-center gap-1 hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            <ImageIcon size={14} /> Abrir en pestaña nueva
          </a>
        </div>
      )}
    </div>
  );
};
export default PaymentsPage;
