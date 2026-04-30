import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useNemuImport } from '../../hooks/useNemuImport';
import { supabase } from '../../lib/supabase';
import { ShoppingBag, ChevronRight, Package, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';
import { Skeleton } from '../ui/Skeleton';

interface NemuImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  catalogId: string;
  onSuccess: () => void;
}

export const NemuImportModal: React.FC<NemuImportModalProps> = ({ isOpen, onClose, catalogId, onSuccess }) => {
  const { getStores, getStoreProducts, importProducts, loading, importing, progress, total } = useNemuImport(catalogId);
  
  const [step, setStep] = useState<'stores' | 'confirm' | 'progress'>('stores');
  const [stores, setStores] = useState<any[]>([]);
  const [selectedStore, setSelectedStore] = useState<any>(null);
  const [productsToImport, setProductsToImport] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen) {
      loadStores();
    } else {
      // Reset state on close
      setStep('stores');
      setSelectedStore(null);
      setProductsToImport([]);
    }
  }, [isOpen]);

  const loadStores = async () => {
    const data = await getStores();
    setStores(data);
  };

  const handleSelectStore = async (store: any) => {
    setSelectedStore(store);
    const data = await getStoreProducts(store.id);
    setProductsToImport(data);
    setStep('confirm');
  };

  const handleStartImport = async () => {
    setStep('progress');
    
    // Vincular el catálogo con la tienda de Nemu
    if (selectedStore?.id) {
      await supabase
        .from('catalogs')
        .update({ nemu_store_id: selectedStore.id })
        .eq('id', catalogId);
    }

    const success = await importProducts(productsToImport);
    if (success) {
      onSuccess();
      onClose();
    } else {
      setStep('confirm');
    }
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Vincular con Nemu"
    >
      <div className="space-y-4">
        {step === 'stores' && (
          <div className="space-y-3">
            <p className="text-sm text-secondary">Selecciona la tienda de Nemu que deseas vincular:</p>
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-16 w-full rounded-2xl" />
                <Skeleton className="h-16 w-full rounded-2xl" />
                <Skeleton className="h-16 w-full rounded-2xl" />
              </div>
            ) : stores.length === 0 ? (
              <div className="text-center py-8">
                <ShoppingBag size={48} className="mx-auto text-white/10 mb-2" />
                <p className="text-secondary">No se encontraron tiendas activas.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {stores.map((store) => (
                  <button
                    key={store.id}
                    onClick={() => handleSelectStore(store)}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl bg-surface-hover hover:bg-white/5 border border-white/5 transition-all text-left"
                  >
                    {store.logo_url ? (
                      <img src={store.logo_url} alt={store.name} className="w-12 h-12 rounded-xl object-cover" />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center text-accent">
                        <ShoppingBag size={24} />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-primary truncate">{store.name}</h3>
                      <p className="text-xs text-secondary truncate">{store.description || 'Sin descripción'}</p>
                    </div>
                    <ChevronRight size={20} className="text-secondary" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {step === 'confirm' && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-accent/10 border border-accent/20">
              <ShoppingBag className="text-accent" />
              <div>
                <p className="text-xs text-accent font-bold uppercase tracking-wider">Tienda origen</p>
                <p className="font-bold text-primary">{selectedStore?.name}</p>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="font-bold text-primary flex items-center gap-2">
                <Package size={20} className="text-accent" />
                Se vincularán {productsToImport.length} productos
              </h3>
              <p className="text-sm text-secondary leading-relaxed">
                Se sincronizarán los textos (nombre, descripción), precios, monedas e imágenes principales con tu catálogo de Matum.
              </p>
            </div>

            <div className="flex flex-col gap-2 pt-4">
              <Button 
                onClick={handleStartImport} 
                className="w-full"
                loading={loading}
              >
                Vincular productos
              </Button>
              <Button 
                variant="ghost" 
                onClick={() => setStep('stores')} 
                icon={ArrowLeft}
                className="w-full"
              >
                Elegir otra tienda
              </Button>
            </div>
          </div>
        )}

        {step === 'progress' && (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-6">
            <div className="relative">
              <div className="w-24 h-24 rounded-full border-4 border-white/5 flex items-center justify-center">
                <Loader2 size={48} className="text-accent animate-spin" />
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-bold text-accent">
                   {total > 0 ? Math.round((progress / total) * 100) : 0}%
                </span>
              </div>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-primary">Vinculando productos...</h3>
              <p className="text-secondary">Procesando {progress} de {total}</p>
            </div>

            <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden max-w-xs mx-auto">
              <div 
                className="bg-accent h-full transition-all duration-300" 
                style={{ width: `${total > 0 ? (progress / total) * 100 : 0}%` }}
              />
            </div>
            
            <p className="text-[10px] text-secondary/50 uppercase tracking-widest font-bold">Por favor no cierres la ventana</p>
          </div>
        )}
      </div>
    </Modal>
  );
};
