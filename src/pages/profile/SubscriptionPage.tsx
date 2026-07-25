import React, { useEffect, useState, useRef } from 'react';
import { useAuthStore } from '../../store/authStore';
import { usePlanStore } from '../../store/planStore';
import { useSubscriptionStore } from '../../store/subscriptionStore';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { 
  Check, 
  CreditCard, 
  Sparkles, 
  Clock, 
  UploadCloud, 
  ArrowLeft, 
  AlertCircle,
  LayoutGrid,
  ShoppingBag,
  Users,
  FileText
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'react-hot-toast';
import { optimizeImage, blobToFile } from '../../lib/imageOptimizer';

export const SubscriptionPage: React.FC = () => {
  const { user, loadUser } = useAuthStore();
  const { plans, getPlans } = usePlanStore();
  const { 
    subscription, 
    transactions, 
    loading, 
    fetchSubscription, 
    fetchTransactions, 
    createTransaction 
  } = useSubscriptionStore();
  
  const navigate = useNavigate();
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'semesterly' | 'annually'>('monthly');
  const [paymentMethod, setPaymentMethod] = useState<string>('transferencia_cup');
  const [reference, setReference] = useState<string>('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getPlans();
    if (user?.id) {
      fetchSubscription(user.id);
      fetchTransactions(user.id);
    }
  }, [user?.id, getPlans, fetchSubscription, fetchTransactions]);

  // Filtrar el plan Premium para que no se muestre
  const visiblePlans = plans.filter(plan => plan.id !== 'premium' && plan.is_active);

  const activePlanDetails = plans.find(p => p.id === (user?.plan || 'free'));
  const selectedPlan = plans.find(p => p.id === selectedPlanId);

  // Transacción pendiente si existe
  const pendingTransaction = transactions.find(t => t.status === 'pending');

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const toastId = toast.loading('Procesando imagen del comprobante...');
      try {
        const optimizedBlob = await optimizeImage(file, {
          maxWidth: 1200,
          maxHeight: 1200,
          quality: 0.75,
        });
        const optimizedFile = blobToFile(optimizedBlob, file.name || 'receipt.jpg');
        setReceiptFile(optimizedFile);

        const reader = new FileReader();
        reader.onloadend = () => {
          setReceiptPreview(reader.result as string);
        };
        reader.readAsDataURL(optimizedFile);
        toast.success('Comprobante listo', { id: toastId });
      } catch (err: any) {
        console.error('Error al procesar el comprobante:', err);
        toast.error('Error al procesar la imagen del comprobante', { id: toastId });
      }
    }
  };

  const calculatePrice = (planPrice: number, cycle: typeof billingCycle) => {
    let multiplier = 1;
    let discount = 0; // 0%
    
    if (cycle === 'semesterly') {
      multiplier = 6;
      discount = 0.15; // 15%
    } else if (cycle === 'annually') {
      multiplier = 12;
      discount = 0.30; // 30%
    }

    const subtotal = planPrice * multiplier;
    const finalPrice = Math.round(subtotal * (1 - discount));
    return finalPrice;
  };

  const getBillingCycleText = (cycle: typeof billingCycle) => {
    switch (cycle) {
      case 'semesterly': return 'Semestral (15% desc.)';
      case 'annually': return 'Anual (30% desc.)';
      default: return 'Mensual';
    }
  };

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !selectedPlanId || !receiptFile) {
      toast.error('Por favor, selecciona un plan y carga la captura de pago.');
      return;
    }

    setIsSubmitting(true);
    toast.loading('Enviando comprobante de pago...', { id: 'payment' });

    try {
      const planPrice = selectedPlan?.price_cup || 0;
      const amount = calculatePrice(planPrice, billingCycle);

      await createTransaction(
        user.id,
        {
          plan_id: selectedPlanId,
          billing_cycle: billingCycle,
          amount,
          currency: 'CUP',
          payment_method: paymentMethod,
          transaction_reference: reference
        },
        receiptFile
      );

      toast.success('Pago enviado con éxito. Un administrador lo revisará pronto ✨', { id: 'payment', duration: 5000 });
      setSelectedPlanId(null);
      setReceiptFile(null);
      setReceiptPreview(null);
      setReference('');
    } catch (err: any) {
      toast.error(`Error al enviar: ${err.message || 'Verifica los datos'}`, { id: 'payment' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 max-w-lg mx-auto pb-24 space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-2">
        <button 
          onClick={() => navigate('/profile')}
          className="p-2 hover:bg-surface-hover rounded-xl text-secondary hover:text-primary transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <PageHeader 
          title="Mi Suscripción" 
          subtitle="Planes y Estado de Cuenta"
        />
      </div>

      {/* 1. Plan actual del usuario */}
      <div className="card p-5 border-border bg-gradient-to-br from-surface to-surface-hover/30 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 text-accent flex items-center justify-center border border-accent/20">
              <CreditCard size={20} />
            </div>
            <div>
              <p className="text-[10px] text-secondary font-bold uppercase tracking-wider">Plan Activo</p>
              <h3 className="font-extrabold text-primary text-lg">
                {activePlanDetails?.name || 'Gratuito'}
              </h3>
            </div>
          </div>
          
          <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border ${
            user?.plan !== 'free' && subscription?.status === 'active'
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : 'bg-secondary/10 text-secondary border-secondary/20'
          }`}>
            {user?.plan === 'free' ? 'Básico Ilimitado' : (subscription?.status === 'active' ? 'Activo' : 'Vencido')}
          </span>
        </div>

        {/* Detalles de expiración si no es free */}
        {user?.plan !== 'free' && subscription && (
          <div className="flex items-center gap-2 text-xs text-secondary border-t border-border/50 pt-3">
            <Clock size={14} className="text-accent" />
            <span>
              Vence el: <strong className="text-primary">{format(new Date(subscription.expires_at), "d 'de' MMMM, yyyy", { locale: es })}</strong>
            </span>
          </div>
        )}

        {/* Info adicional de límites */}
        {activePlanDetails && (
          <div className="grid grid-cols-3 gap-2 pt-1">
            <div className="bg-surface/50 p-2.5 rounded-xl border border-border/40 flex flex-col items-center">
              <LayoutGrid size={14} className="text-accent mb-1" />
              <span className="text-[10px] text-secondary uppercase font-bold">Catálogos</span>
              <span className="text-sm font-black text-primary">{activePlanDetails.catalogs_limit}</span>
            </div>
            <div className="bg-surface/50 p-2.5 rounded-xl border border-border/40 flex flex-col items-center">
              <ShoppingBag size={14} className="text-purple-400 mb-1" />
              <span className="text-[10px] text-secondary uppercase font-bold">Productos</span>
              <span className="text-sm font-black text-primary">{activePlanDetails.products_limit}</span>
            </div>
            <div className="bg-surface/50 p-2.5 rounded-xl border border-border/40 flex flex-col items-center">
              <Users size={14} className="text-blue-400 mb-1" />
              <span className="text-[10px] text-secondary uppercase font-bold">Grupos WA</span>
              <span className="text-sm font-black text-primary">{activePlanDetails.groups_limit}</span>
            </div>
          </div>
        )}
      </div>

      {/* 2. Alerta de pago pendiente */}
      {pendingTransaction && (
        <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 text-amber-400 flex gap-3 text-xs leading-relaxed animate-pulse">
          <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold">Pago en revisión</p>
            <p>Tienes una solicitud pendiente de aprobación para el Plan <strong>{plans.find(p => p.id === pendingTransaction.plan_id)?.name}</strong>.</p>
            <p className="text-[10px] text-amber-500/70">Ref: {pendingTransaction.transaction_reference || 'N/A'}</p>
          </div>
        </div>
      )}

      {/* 3. Selección de planes (Solo si no hay pagos pendientes) */}
      {!pendingTransaction && !selectedPlanId && (
        <div className="space-y-4">
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-secondary px-1">Planes Disponibles</h3>
          
          <div className="space-y-3">
            {visiblePlans.map((plan) => {
              const isCurrent = user?.plan === plan.id;
              
              return (
                <div 
                  key={plan.id}
                  className={`card p-5 border transition-all flex flex-col gap-4 ${
                    isCurrent 
                      ? 'border-accent/40 bg-accent/5' 
                      : 'border-border hover:border-accent/20 cursor-pointer active:scale-[0.98]'
                  }`}
                  onClick={() => !isCurrent && setSelectedPlanId(plan.id)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-extrabold text-primary text-base flex items-center gap-1.5">
                        {plan.name}
                        {isCurrent && <Check size={14} className="text-accent" />}
                      </h4>
                      <p className="text-xs text-secondary mt-1">{plan.description}</p>
                    </div>
                    <div className="text-right">
                      {plan.id === 'free' ? (
                        <span className="text-base font-black text-primary">Gratis</span>
                      ) : (
                        <div className="flex flex-col items-end">
                          <span className="text-base font-black text-primary">${plan.price_cup} CUP</span>
                          <span className="text-[9px] text-secondary uppercase font-bold tracking-tighter">/ mes</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-[11px] border-t border-border/40 pt-3 text-secondary">
                    <div className="flex items-center gap-1">
                      <LayoutGrid size={12} className="text-accent" />
                      <span>{plan.catalogs_limit} Catálogos</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <ShoppingBag size={12} className="text-purple-400" />
                      <span>{plan.products_limit} Prods</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users size={12} className="text-blue-400" />
                      <span>{plan.groups_limit === 0 ? 'Sin WhatsApp' : `${plan.groups_limit} Grupos`}</span>
                    </div>
                  </div>

                  {/* Restricción de IA Gemini */}
                  <div className="text-[10px] text-secondary flex items-center gap-1.5 bg-surface-hover/30 p-2 rounded-lg">
                    <Sparkles size={10} className="text-purple-400" />
                    <span>
                      {plan.id === 'free' 
                        ? 'Asistente de IA Gemini no disponible' 
                        : 'Requiere configurar tu propia clave API de Gemini'}
                    </span>
                  </div>

                  {!isCurrent && (
                    <button className="w-full py-2.5 px-4 bg-surface hover:bg-surface-hover text-primary font-bold text-xs rounded-xl border border-border transition-colors uppercase tracking-wider">
                      Seleccionar Plan
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. Formulario de pago si un plan está seleccionado */}
      {selectedPlanId && selectedPlan && (
        <form onSubmit={handleSubmitPayment} className="card p-5 border-accent/20 bg-surface space-y-6 animate-in slide-in-from-bottom duration-300">
          <div className="flex items-center justify-between border-b border-border/50 pb-4">
            <div>
              <h3 className="font-extrabold text-primary text-base">Completar Suscripción</h3>
              <p className="text-xs text-secondary">Adquiriendo Plan: <strong>{selectedPlan.name}</strong></p>
            </div>
            <button 
              type="button"
              onClick={() => {
                setSelectedPlanId(null);
                setReceiptFile(null);
                setReceiptPreview(null);
              }}
              className="text-xs font-bold text-secondary hover:text-primary transition-colors"
            >
              Cancelar
            </button>
          </div>

          {/* Selector de Ciclo */}
          <Select
            label="Ciclo de Facturación"
            value={billingCycle}
            onChange={(e) => setBillingCycle(e.target.value as any)}
          >
            <option value="monthly" className="bg-surface text-primary">Mensual - ${selectedPlan.price_cup} CUP / mes</option>
            <option value="semesterly" className="bg-surface text-primary">Semestral (15% Descuento) - ${calculatePrice(selectedPlan.price_cup, 'semesterly')} CUP total</option>
            <option value="annually" className="bg-surface text-primary">Anual (30% Descuento) - ${calculatePrice(selectedPlan.price_cup, 'annually')} CUP total</option>
          </Select>

          {/* Información de depósito */}
          <div className="p-4 rounded-xl bg-surface-hover border border-border space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-accent flex items-center gap-1.5">
              <CreditCard size={14} />
              Instrucciones de Pago (CUP)
            </h4>
            <div className="text-xs text-secondary space-y-1.5 leading-relaxed">
              <p>Por favor transfiere el total de <strong className="text-primary font-black">${calculatePrice(selectedPlan.price_cup, billingCycle)} CUP</strong> a la siguiente tarjeta:</p>
              <div className="bg-background p-3 rounded-lg border border-border flex items-center justify-between select-all font-mono font-bold text-primary">
                <span>9200 1234 5678 9012</span>
                <span className="text-[10px] text-secondary font-sans font-normal uppercase">CUP / Bandec</span>
              </div>
              <p className="text-[10px] text-secondary">Una vez realizada, sube la captura de pantalla o foto del comprobante abajo para que validemos la transacción.</p>
            </div>
          </div>

          <Input
            label="Número / Referencia de Transacción"
            placeholder="Ej. 128471"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            required
            helperText="Ingresa el ID de transacción de Transfermóvil, Enzona o el banco."
          />

          {/* Comprobante de pago (File upload) */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-secondary ml-1 block">Foto del Comprobante</label>
            <div 
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer hover:bg-surface-hover/30 transition-all flex flex-col items-center justify-center gap-2 ${
                receiptFile ? 'border-accent/40 bg-accent/5' : 'border-border'
              }`}
            >
              {receiptPreview ? (
                <div className="relative w-full max-h-40 rounded-xl overflow-hidden flex items-center justify-center">
                  <img src={receiptPreview} alt="Receipt preview" className="max-h-40 object-contain rounded-lg" />
                  <span className="absolute bottom-2 right-2 bg-black/60 text-white text-[9px] px-2 py-1 rounded-md font-bold uppercase tracking-wider flex items-center gap-1">
                    <FileText size={10} /> Cambiar Foto
                  </span>
                </div>
              ) : (
                <>
                  <UploadCloud size={32} className="text-secondary/70" />
                  <span className="text-xs font-bold text-primary">Haz clic para subir o capturar el recibo</span>
                  <span className="text-[10px] text-secondary">Formatos: JPG, PNG, JPEG. Máx 5MB</span>
                </>
              )}
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*"
              onChange={handleFileChange}
              required
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            loading={isSubmitting}
            disabled={!receiptFile || isSubmitting}
            size="lg"
          >
            Reportar Pago y Solicitar Plan
          </Button>
        </form>
      )}

      {/* 5. Historial de transacciones */}
      {transactions.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-secondary px-1">Historial de Pagos</h3>
          
          <div className="space-y-2">
            {transactions.map((t) => {
              const plan = plans.find(p => p.id === t.plan_id);
              
              const statusColors = {
                pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
                approved: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
                rejected: 'bg-red-500/10 text-red-400 border-red-500/20'
              };

              const statusText = {
                pending: 'Pendiente',
                approved: 'Aprobado',
                rejected: 'Rechazado'
              };

              return (
                <div key={t.id} className="card p-4 border-border/80 bg-surface-hover/20 flex justify-between items-center text-xs">
                  <div className="space-y-1">
                    <p className="font-bold text-primary">Plan {plan?.name || t.plan_id}</p>
                    <p className="text-[10px] text-secondary">{getBillingCycleText(t.billing_cycle)} • {format(new Date(t.created_at || ''), 'dd/MM/yyyy HH:mm')}</p>
                    {t.rejection_reason && (
                      <p className="text-[10px] text-red-400 font-medium bg-red-500/5 p-2 rounded-lg mt-1.5 border border-red-500/10">
                        Motivo de rechazo: {t.rejection_reason}
                      </p>
                    )}
                  </div>

                  <div className="text-right space-y-2 flex flex-col items-end">
                    <span className="font-black text-primary">${t.amount} CUP</span>
                    <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${statusColors[t.status]}`}>
                      {statusText[t.status]}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
export default SubscriptionPage;
