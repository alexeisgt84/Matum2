import React from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Zap, Check } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { PLAN_LIMITS, type PlanType } from '../../lib/planLimits';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPlan: PlanType;
  reachedLimit: 'catalogs' | 'products' | 'groups';
}

export const UpgradeModal: React.FC<UpgradeModalProps> = ({ 
    isOpen, 
    onClose, 
    currentPlan,
    reachedLimit 
}) => {
  const nextPlans: PlanType[] = ['basic', 'pro', 'premium'];
  const currentIndex = nextPlans.indexOf(currentPlan);
  const nextPlanKey = nextPlans[currentIndex + 1] || 'premium';
  const nextLimits = PLAN_LIMITS[nextPlanKey];

  const limitLabels = {
    catalogs: 'catálogos',
    products: 'productos',
    groups: 'grupos'
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="¡Límite alcanzado!"
      footer={
        <Button 
          className="w-full" 
          onClick={() => {
            toast.success('Próximamente: Pasarela de pagos');
            onClose();
          }}
        >
          Ver planes y precios
        </Button>
      }
    >
      <div className="text-center space-y-6">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-amber-500/10 text-amber-500 mb-2">
          <Zap size={44} fill="currentColor" />
        </div>
        
        <div>
          <h3 className="text-white text-lg font-bold">
            Has llegado al límite de {limitLabels[reachedLimit]}
          </h3>
          <p className="text-gray-400 mt-2">
            Tu plan actual ({currentPlan}) solo permite {PLAN_LIMITS[currentPlan][reachedLimit]} {limitLabels[reachedLimit]}.
          </p>
        </div>

        <div className="bg-surface-hover rounded-2xl p-6 text-left border border-border">
          <p className="text-[var(--accent)] text-xs font-bold uppercase tracking-widest mb-4">
            Recomendado: Plan {nextPlanKey.toUpperCase()}
          </p>
          <ul className="space-y-3">
            <li className="flex items-center gap-3 text-sm text-white">
              <Check size={18} className="text-[var(--accent)]" />
              Hasta {nextLimits.catalogs} catálogos
            </li>
            <li className="flex items-center gap-3 text-sm text-white">
              <Check size={18} className="text-[var(--accent)]" />
              Hasta {nextLimits.products} productos
            </li>
            <li className="flex items-center gap-3 text-sm text-white">
              <Check size={18} className="text-[var(--accent)]" />
              Hasta {nextLimits.groups} grupos por catálogo
            </li>
          </ul>
        </div>
      </div>
    </Modal>
  );
};
