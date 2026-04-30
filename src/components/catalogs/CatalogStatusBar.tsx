import React from 'react';
import { 
  MessageSquare, 
  Zap, 
  Package, 
  Users,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface CatalogStatusBarProps {
  stats: {
    totalMessages: number;
    sequenceMessages: number;
    totalProducts: number;
    activeGroups: number;
    queuePending?: number;
    queueSent?: number;
    queueError?: number;
  };
  loading?: boolean;
}

export const CatalogStatusBar: React.FC<CatalogStatusBarProps> = ({ stats, loading }) => {
  const StatItem = ({ icon: Icon, label, value, color }: { icon: any, label: string, value: number, color: string }) => (
    <div className="flex flex-col items-center justify-center px-4 py-2 first:pl-0 last:pr-0 border-r border-border last:border-0">
      <div className="flex items-center gap-1.5 mb-0.5">
        <Icon size={12} className={color} />
        <span className="text-[9px] font-bold uppercase tracking-wider text-secondary">{label}</span>
      </div>
      <span className="text-sm font-bold text-primary tabular-nums">
        {loading ? '...' : value}
      </span>
    </div>
  );

  return (
    <div className="mx-4 mb-4 p-1 bg-surface-hover/20 backdrop-blur-md rounded-2xl border border-border overflow-hidden">
      <div className="flex items-center justify-around divide-x divide-border">
        <StatItem 
          icon={MessageSquare} 
          label="Mensajes" 
          value={stats.totalMessages} 
          color="text-blue-400" 
        />
        <StatItem 
          icon={Zap} 
          label="Secuencia" 
          value={stats.sequenceMessages} 
          color="text-yellow-400" 
        />
        <StatItem 
          icon={Package} 
          label="Productos" 
          value={stats.totalProducts} 
          color="text-purple-400" 
        />
        <StatItem 
          icon={Users} 
          label="Grupos" 
          value={stats.activeGroups} 
          color="text-accent" 
        />
        
        {(stats.queuePending !== undefined && stats.queuePending > 0) && (
          <StatItem 
            icon={Clock} 
            label="En cola" 
            value={stats.queuePending} 
            color="text-orange-400 animate-pulse" 
          />
        )}

        {(stats.queueSent !== undefined && stats.queueSent > 0) && (
          <StatItem 
            icon={CheckCircle2} 
            label="Enviados" 
            value={stats.queueSent} 
            color="text-green-400" 
          />
        )}

        {(stats.queueError !== undefined && stats.queueError > 0) && (
          <StatItem 
            icon={AlertCircle} 
            label="Errores" 
            value={stats.queueError} 
            color="text-red-400" 
          />
        )}
      </div>
    </div>
  );
};
