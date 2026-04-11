import React, { useEffect } from 'react';
import { useHistory } from '../../hooks/useHistory';
import { Clock, CheckCircle2, XCircle } from 'lucide-react';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageHeader } from '../../components/ui/PageHeader';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Skeleton } from '../../components/ui/Skeleton';

export const HistoryPage = () => {
  const { logs, loading, getLogs } = useHistory();

  useEffect(() => {
    getLogs();
  }, [getLogs]);

  return (
    <div className="p-4 max-w-lg mx-auto pb-24">
      <PageHeader 
        title="Historial" 
        subtitle="Registro de Actividad"
      />

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="card p-5 flex items-start gap-4 animate-pulse border-white/5">
              <Skeleton className="h-12 w-12 rounded-2xl flex-shrink-0" />
              <div className="flex-1 space-y-3">
                <div className="flex justify-between items-start">
                  <Skeleton className="h-5 w-1/3" />
                  <Skeleton className="h-4 w-12 rounded-lg" />
                </div>
                <Skeleton className="h-4 w-1/2" />
                <div className="flex items-center gap-2 mt-2">
                  <Skeleton className="h-3 w-3 rounded-full" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : logs.length === 0 ? (
        <EmptyState
          icon={Clock}
          title="Sin actividad reciente"
          description="Aquí aparecerán los detalles de los envíos realizados a tus grupos."
        />
      ) : (
        <div className="space-y-4">
          {logs.map((log) => (
            <div key={log.id} className="card group hover:border-[#25D366]/20 transition-all flex items-start gap-4 p-5 bg-[#121212]">
              <div className={`p-3 rounded-2xl flex-shrink-0 ${
                log.status === 'success' ? 'bg-[#25D366]/10 text-[#25D366]' : 'bg-red-500/10 text-red-500'
              }`}>
                {log.status === 'success' ? <CheckCircle2 size={24} /> : <XCircle size={24} />}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                  <h3 className="text-white font-bold text-sm truncate uppercase tracking-tight group-hover:text-[#25D366] transition-colors">
                    {log.catalog_name}
                  </h3>
                  <span className="text-[10px] text-gray-600 font-bold whitespace-nowrap ml-2 bg-white/5 px-2 py-0.5 rounded-lg border border-white/5">
                    {format(new Date(log.created_at), "HH:mm")}
                  </span>
                </div>
                
                <p className="text-gray-400 text-[11px] mt-2 leading-relaxed">
                  Enviado al grupo: <span className="text-gray-200 font-medium">{log.group_name}</span>
                </p>

                <div className="flex items-center gap-2 mt-4 text-[10px] font-bold text-gray-600 uppercase tracking-widest">
                  <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
                  <span>{format(new Date(log.created_at), "d 'de' MMMM, yyyy", { locale: es })}</span>
                </div>

                {log.status === 'failed' && log.error_message && (
                  <div className="mt-4 p-3 bg-red-500/5 border border-red-500/10 rounded-xl">
                    <p className="text-[10px] text-red-400 font-medium italic">
                      Error: {log.error_message}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-20 flex flex-col items-center gap-4 opacity-30 select-none">
        <div className="h-px w-24 bg-gradient-to-r from-transparent via-gray-500 to-transparent" />
        <p className="text-[10px] uppercase tracking-[0.3em] text-gray-500 font-black">
          Fin del Historial
        </p>
      </div>
    </div>
  );
};
