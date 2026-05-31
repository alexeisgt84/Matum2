import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { useCatalogs } from '../../hooks/useCatalogs';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { EmptyState } from '../../components/ui/EmptyState';
import { Skeleton } from '../../components/ui/Skeleton';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Modal } from '../../components/ui/Modal';
import { toast } from 'react-hot-toast';
import { 
  Bookmark, 
  Plus, 
  Trash2, 
  ChevronRight, 
  ArrowLeft, 
  ShoppingBag, 
  Info,
  DollarSign,
  CheckCircle,
  Package,
  Layers
} from 'lucide-react';
import type { Catalog } from '../../types/catalog';
import type { Product } from '../../types/product';

interface FollowedCatalogItem {
  id: string;
  catalog_id: string;
  created_at: string;
  catalogs: Catalog & { productCount?: number };
}

export const FollowedCatalogsPage = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  
  // Catálogos propios del usuario para el selector de importación
  const { catalogs: myCatalogs, getCatalogs: getMyCatalogs } = useCatalogs();

  // Estados de carga e interfaz
  const [followed, setFollowed] = useState<FollowedCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [followCode, setFollowCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Estados para dejar de seguir
  const [catalogToUnfollow, setCatalogToUnfollow] = useState<string | null>(null);
  const [isUnfollowing, setIsUnfollowing] = useState(false);

  // Estados para ver detalle del catálogo seguido
  const [activeCatalog, setActiveCatalog] = useState<Catalog | null>(null);
  const [catalogProducts, setCatalogProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  
  // Selección de productos para importación
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  
  // Modal de importación y configuración de precios
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [targetCatalogId, setTargetCatalogId] = useState('');
  const [globalIncrement, setGlobalIncrement] = useState<string>('');
  const [individualPrices, setIndividualPrices] = useState<Record<string, string>>({});
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    fetchFollowedCatalogs();
    getMyCatalogs();
  }, []);

  // Cargar catálogos seguidos
  const fetchFollowedCatalogs = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // 1. Obtener catálogos seguidos
      const { data, error } = await supabase
        .from('followed_catalogs')
        .select(`
          id,
          catalog_id,
          created_at,
          catalogs:catalogs(*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedData: FollowedCatalogItem[] = [];

      // 2. Cargar recuento de productos para cada uno
      if (data && data.length > 0) {
        for (const item of data) {
          if (item.catalogs) {
            const { count } = await supabase
              .from('products')
              .select('*', { count: 'exact', head: true })
              .eq('catalog_id', item.catalog_id)
              .eq('is_active', true);
            
            formattedData.push({
              ...item,
              catalogs: {
                ...item.catalogs,
                productCount: count || 0
              }
            } as any);
          }
        }
      }

      setFollowed(formattedData);
    } catch (err: any) {
      toast.error('Error al cargar catálogos seguidos: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Seguir un catálogo nuevo
  const handleFollowSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!followCode.trim()) {
      toast.error('Ingresa un código de seguimiento válido');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Buscar el catálogo con el follow_code
      const { data: targetCatalog, error: searchError } = await supabase
        .from('catalogs')
        .select('id, name, user_id, is_active, is_public')
        .eq('follow_code', followCode.trim().toUpperCase())
        .single();

      if (searchError || !targetCatalog) {
        toast.error('No se encontró ningún catálogo con ese código');
        setIsSubmitting(false);
        return;
      }

      // 2. Validar que no sea un catálogo propio
      if (targetCatalog.user_id === user.id) {
        toast.error('No puedes seguir tus propios catálogos');
        setIsSubmitting(false);
        return;
      }

      // 3. Validar que esté activo y sea público
      if (!targetCatalog.is_active || !targetCatalog.is_public) {
        toast.error('Este catálogo no se encuentra público o activo actualmente');
        setIsSubmitting(false);
        return;
      }

      // 4. Validar si ya lo sigue
      const isAlreadyFollowed = followed.some(item => item.catalog_id === targetCatalog.id);
      if (isAlreadyFollowed) {
        toast.error('Ya sigues a este catálogo');
        setIsSubmitting(false);
        return;
      }

      // 5. Crear la relación de seguimiento
      const { error: insertError } = await supabase
        .from('followed_catalogs')
        .insert({
          user_id: user.id,
          catalog_id: targetCatalog.id
        });

      if (insertError) throw insertError;

      toast.success(`Ahora sigues el catálogo "${targetCatalog.name}"`);
      setFollowCode('');
      fetchFollowedCatalogs();
    } catch (err: any) {
      toast.error('Error al seguir catálogo: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Dejar de seguir catálogo
  const handleUnfollowConfirm = async () => {
    if (!catalogToUnfollow || !user) return;
    setIsUnfollowing(true);
    try {
      const { error } = await supabase
        .from('followed_catalogs')
        .delete()
        .eq('catalog_id', catalogToUnfollow)
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success('Dejaste de seguir el catálogo');
      setCatalogToUnfollow(null);
      fetchFollowedCatalogs();
      if (activeCatalog?.id === catalogToUnfollow) {
        setActiveCatalog(null);
      }
    } catch (err: any) {
      toast.error('Error al dejar de seguir: ' + err.message);
    } finally {
      setIsUnfollowing(false);
    }
  };

  // Cargar productos del catálogo seguido
  const handleViewCatalogProducts = async (catalog: Catalog) => {
    setActiveCatalog(catalog);
    setProductsLoading(true);
    setSelectedProductIds([]);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('catalog_id', catalog.id)
        .eq('is_active', true)
        .order('position', { ascending: true });

      if (error) throw error;
      setCatalogProducts(data || []);
    } catch (err: any) {
      toast.error('Error al cargar productos del catálogo seguido: ' + err.message);
    } finally {
      setProductsLoading(false);
    }
  };

  // Manejar selección individual de productos
  const toggleSelectProduct = (productId: string) => {
    setSelectedProductIds(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId) 
        : [...prev, productId]
    );
  };

  // Seleccionar o deseleccionar todos los productos
  const handleSelectAll = () => {
    if (selectedProductIds.length === catalogProducts.length) {
      setSelectedProductIds([]);
    } else {
      setSelectedProductIds(catalogProducts.map(p => p.id));
    }
  };

  // Abrir modal de importación
  const handleOpenImportModal = () => {
    if (selectedProductIds.length === 0) {
      toast.error('Selecciona al menos un producto para importar');
      return;
    }

    // Inicializar catálogo de destino con el primero propio si existe
    if (myCatalogs.length > 0) {
      setTargetCatalogId(myCatalogs[0].id);
    } else {
      setTargetCatalogId('');
    }

    // Limpiar incrementos
    setGlobalIncrement('');
    const initialPrices: Record<string, string> = {};
    selectedProductIds.forEach(id => {
      const prod = catalogProducts.find(p => p.id === id);
      if (prod) {
        initialPrices[id] = String(prod.price || 0);
      }
    });
    setIndividualPrices(initialPrices);
    setIsImportModalOpen(true);
  };

  // Manejar cambio del incremento cuantitativo global
  const handleGlobalIncrementChange = (value: string) => {
    setGlobalIncrement(value);
    
    const increment = parseFloat(value);
    const updatedPrices: Record<string, string> = {};
    
    selectedProductIds.forEach(id => {
      const prod = catalogProducts.find(p => p.id === id);
      if (prod) {
        const base = prod.price || 0;
        if (!isNaN(increment) && increment > 0) {
          updatedPrices[id] = String(base + increment);
        } else {
          updatedPrices[id] = String(base);
        }
      }
    });
    
    setIndividualPrices(updatedPrices);
  };

  // Manejar cambio en un input de precio individual
  const handleIndividualPriceChange = (productId: string, value: string) => {
    setIndividualPrices(prev => ({
      ...prev,
      [productId]: value
    }));
  };

  // Ejecutar importación
  const handleImportExecute = async () => {
    if (!targetCatalogId) {
      toast.error('Selecciona un catálogo destino para la importación');
      return;
    }

    setIsImporting(true);
    const toastId = toast.loading('Importando productos…');
    try {
      const productsToInsert = selectedProductIds.map((id, index) => {
        const sourceProd = catalogProducts.find(p => p.id === id)!;
        const customPriceStr = individualPrices[id];
        const customPrice = parseFloat(customPriceStr);

        return {
          catalog_id: targetCatalogId,
          name: sourceProd.name,
          description: sourceProd.description,
          imagen_url: sourceProd.imagen_url,
          price: isNaN(customPrice) ? sourceProd.price : customPrice,
          currency: sourceProd.currency,
          parent_product_id: sourceProd.id,
          base_price: sourceProd.price,
          is_active: true,
          is_out_of_stock: sourceProd.is_out_of_stock,
          stock_status: sourceProd.stock_status,
          position: index + 1000 // Colocarlos al final provisionalmente
        };
      });

      const { error } = await supabase
        .from('products')
        .insert(productsToInsert);

      if (error) throw error;

      toast.success(`${selectedProductIds.length} productos importados correctamente`, { id: toastId });
      setIsImportModalOpen(false);
      setSelectedProductIds([]);
      // Redirigir al detalle del catálogo destino para ver los productos importados
      navigate(`/catalogs/${targetCatalogId}`);
    } catch (err: any) {
      toast.error('Error al importar productos: ' + err.message, { id: toastId });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="p-4 max-w-lg mx-auto pb-24 space-y-6 w-full">
      
      {!activeCatalog ? (
        /* VISTA A: LISTADO DE CATÁLOGOS SEGUIDOS */
        <>
          <PageHeader 
            title="Catálogos Seguidos" 
            subtitle="Monitorea e Importa Tiendas"
          />

          {/* Formulario de Seguimiento */}
          <form onSubmit={handleFollowSubmit} className="card p-4 flex gap-2 items-end border-border bg-surface w-full">
            <div className="flex-1">
              <label className="text-[10px] font-bold text-secondary uppercase tracking-widest block mb-2">Seguir nuevo catálogo</label>
              <Input
                placeholder="Código de seguimiento (ej: MAT-7X9B2)"
                value={followCode}
                onChange={(e) => setFollowCode(e.target.value)}
                className="uppercase font-mono"
              />
            </div>
            <Button 
              type="submit" 
              loading={isSubmitting} 
              icon={Plus}
              className="h-11 px-4 shadow-lg shadow-accent/15"
            >
              Seguir
            </Button>
          </form>

          {/* Listado */}
          {loading ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <div key={i} className="card p-5 flex items-center gap-4 animate-pulse border-border">
                  <Skeleton className="w-12 h-12 rounded-xl flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                  <Skeleton className="h-6 w-6 rounded-md" />
                </div>
              ))}
            </div>
          ) : followed.length === 0 ? (
            <EmptyState
              icon={Bookmark}
              title="No sigues ningún catálogo"
              description="Ingresa el código de seguimiento de otro catálogo para poder seguirlo e importar sus productos."
            />
          ) : (
            <div className="space-y-3">
              <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-secondary px-1">Catálogos que sigo ({followed.length})</h2>
              {followed.map((item) => (
                <div 
                  key={item.id}
                  onClick={() => handleViewCatalogProducts(item.catalogs)}
                  className="card p-4 group hover:bg-surface-hover cursor-pointer transition-all border-border flex items-center justify-between active:scale-[0.99] relative overflow-hidden w-full"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-accent/5 rounded-full -mr-12 -mt-12 blur-2xl group-hover:bg-accent/10 transition-colors" />

                  <div className="flex items-center gap-4 flex-1 min-w-0 z-10">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent/20 to-transparent flex items-center justify-center text-accent border border-accent/10 flex-shrink-0">
                      {item.catalogs.logo_url ? (
                        <img src={item.catalogs.logo_url} alt="logo" className="w-full h-full object-cover rounded-xl" />
                      ) : (
                        <ShoppingBag size={22} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-primary truncate group-hover:text-accent transition-colors">{item.catalogs.name}</h3>
                      <p className="text-secondary text-xs truncate mb-1.5">{item.catalogs.description || 'Sin descripción'}</p>
                      
                      <div className="flex items-center gap-3 text-[10px] text-secondary font-bold uppercase tracking-wider">
                        <span className="bg-surface border border-border px-2 py-0.5 rounded-lg text-primary tabular-nums">
                          {item.catalogs.productCount || 0} Productos
                        </span>
                        <span className="font-mono text-accent">
                          {item.catalogs.follow_code}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 z-10 ml-3">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setCatalogToUnfollow(item.catalog_id);
                      }}
                      className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                      title="Dejar de seguir"
                    >
                      <Trash2 size={18} />
                    </button>
                    <ChevronRight size={18} className="text-secondary group-hover:text-primary transition-colors" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        /* VISTA B: DETALLE DE PRODUCTOS DEL CATÁLOGO SEGUIDO */
        <div className="space-y-6 animate-in fade-in duration-300">
          
          {/* Header de navegación interna */}
          <div className="flex items-center justify-between border-b border-border pb-4 bg-background">
            <button 
              onClick={() => setActiveCatalog(null)}
              className="flex items-center gap-2 text-xs font-bold text-secondary hover:text-primary uppercase tracking-wider transition-colors"
            >
              <ArrowLeft size={16} />
              <span>Regresar</span>
            </button>
            <span className="text-[10px] bg-accent/15 border border-accent/20 px-2.5 py-1 rounded-full text-accent font-mono font-bold">
              {activeCatalog.follow_code}
            </span>
          </div>

          <div className="card p-5 bg-gradient-to-br from-surface to-background border-border relative overflow-hidden w-full">
            <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full -mr-16 -mt-16 blur-3xl" />
            <div className="flex gap-4 items-center relative z-10">
              <div className="w-16 h-16 rounded-2xl bg-surface border border-border flex items-center justify-center text-accent flex-shrink-0">
                {activeCatalog.logo_url ? (
                  <img src={activeCatalog.logo_url} alt="logo" className="w-full h-full object-cover rounded-2xl" />
                ) : (
                  <ShoppingBag size={28} />
                )}
              </div>
              <div className="min-w-0">
                <h2 className="text-xl font-bold text-primary leading-tight">{activeCatalog.name}</h2>
                <p className="text-secondary text-sm mt-1 leading-relaxed line-clamp-2">{activeCatalog.description || 'Sin descripción'}</p>
              </div>
            </div>
          </div>

          {/* Listado de Productos del Catálogo Seguido */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <div className="flex flex-col">
                <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-secondary">Productos del origen</h3>
                <span className="text-[10px] text-secondary font-bold tabular-nums">
                  {catalogProducts.length} disponibles · {selectedProductIds.length} seleccionados
                </span>
              </div>
              
              {catalogProducts.length > 0 && (
                <div className="flex gap-2">
                  <button 
                    onClick={handleSelectAll}
                    className="text-[10px] bg-surface-hover hover:bg-surface text-secondary hover:text-primary px-3 py-1.5 rounded-xl border border-border transition-all font-bold uppercase tracking-wider"
                  >
                    {selectedProductIds.length === catalogProducts.length ? 'Ninguno' : 'Todos'}
                  </button>
                  <Button 
                    size="sm" 
                    onClick={handleOpenImportModal}
                    className="px-4 shadow-lg shadow-accent/15"
                    disabled={selectedProductIds.length === 0}
                  >
                    Importar ({selectedProductIds.length})
                  </Button>
                </div>
              )}
            </div>

            {productsLoading ? (
              <div className="grid gap-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="card p-4 flex gap-4 animate-pulse">
                    <Skeleton className="w-16 h-16 rounded-xl flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-4 w-1/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : catalogProducts.length === 0 ? (
              <EmptyState
                icon={Package}
                title="Catálogo vacío"
                description="Este catálogo seguido no tiene ningún producto público y activo en este momento."
              />
            ) : (
              <div className="grid grid-cols-1 gap-3 w-full">
                {catalogProducts.map((product) => {
                  const isSelected = selectedProductIds.includes(product.id);
                  return (
                    <div 
                      key={product.id}
                      onClick={() => toggleSelectProduct(product.id)}
                      className={`card p-4 flex items-center gap-4 cursor-pointer transition-all border w-full ${
                        isSelected 
                          ? 'border-accent bg-accent/5' 
                          : 'border-border hover:border-accent/20 bg-surface'
                      }`}
                    >
                      <div className="flex items-center justify-center">
                        <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${
                          isSelected ? 'border-accent bg-accent text-black' : 'border-border bg-transparent'
                        }`}>
                          {isSelected && <CheckCircle size={14} strokeWidth={3} />}
                        </div>
                      </div>

                      <div className="w-16 h-16 rounded-xl bg-surface border border-border flex items-center justify-center overflow-hidden flex-shrink-0">
                        {product.imagen_url ? (
                          <img src={product.imagen_url} alt={product.name} className="w-full h-full object-cover" />
                        ) : (
                          <Package size={22} className="text-secondary" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-primary truncate leading-tight group-hover:text-accent">{product.name}</h4>
                        <p className="text-secondary text-[11px] truncate mt-1">{product.description || 'Sin descripción'}</p>
                        <span className="text-accent text-xs font-bold font-mono block mt-2 tabular-nums">
                          {product.price} {product.currency}
                        </span>
                      </div>

                      {product.is_out_of_stock && (
                        <span className="text-[8px] bg-red-500/10 text-red-500 border border-red-500/20 px-2 py-0.5 rounded-lg font-black uppercase tracking-wider">
                          Agotado
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMACIÓN DE DESVINCULAR / DEJAR DE SEGUIR */}
      <ConfirmDialog
        isOpen={!!catalogToUnfollow}
        title="Dejar de seguir Catálogo"
        message="¿Estás seguro de que deseas dejar de seguir este catálogo? Ya no podrás ver sus productos para importación a menos que vuelvas a seguirlo."
        confirmLabel="Dejar de seguir"
        onConfirm={handleUnfollowConfirm}
        onClose={() => setCatalogToUnfollow(null)}
        loading={isUnfollowing}
      />

      {/* MODAL DE IMPORTACIÓN HÍBRIDO (CON PRECIOS INDIVIDUALES) */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={() => !isImporting && setIsImportModalOpen(false)}
        title="Importar Productos Seleccionados"
      >
        <div className="space-y-6 py-4 max-h-[80vh] overflow-y-auto pr-1">
          
          {/* Selector de Catálogo Destino */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-secondary uppercase tracking-widest flex items-center gap-1.5">
              <Layers size={12} className="text-accent" />
              1. Seleccionar catálogo destino
            </label>
            {myCatalogs.length === 0 ? (
              <div className="p-3 bg-red-500/5 border border-red-500/10 rounded-xl text-xs text-red-400">
                Debes crear al menos un catálogo propio antes de poder importar productos.
              </div>
            ) : (
              <select
                value={targetCatalogId}
                onChange={(e) => setTargetCatalogId(e.target.value)}
                className="w-full h-11 px-3 bg-surface border border-border rounded-xl text-primary text-sm focus:border-accent focus:outline-none transition-colors"
              >
                {myCatalogs.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            )}
          </div>

          {/* Incremento Global Cuantitativo */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-secondary uppercase tracking-widest flex items-center gap-1.5">
              <DollarSign size={12} className="text-accent" />
              2. Incremento de precio global (Opcional)
            </label>
            <Input
              type="number"
              placeholder="Ej: +1000 (Suma un monto fijo al precio base)"
              value={globalIncrement}
              onChange={(e) => handleGlobalIncrementChange(e.target.value)}
            />
            <p className="text-[9px] text-secondary opacity-60">
              * Este valor cuantitativo se sumará automáticamente al precio base de todos los productos de abajo, pero puedes modificar cada uno libremente.
            </p>
          </div>

          {/* Listado de Productos y Precios Finales */}
          <div className="space-y-3">
            <label className="text-[10px] font-bold text-secondary uppercase tracking-widest block">
              3. Ajustar precios individuales de venta
            </label>
            
            <div className="space-y-2 max-h-[300px] overflow-y-auto border border-border/50 rounded-2xl p-2 bg-background">
              {selectedProductIds.map((id) => {
                const prod = catalogProducts.find(p => p.id === id)!;
                return (
                  <div key={id} className="flex items-center gap-3 p-2 bg-surface border border-border/40 rounded-xl">
                    <div className="w-10 h-10 rounded-lg bg-surface border border-border flex items-center justify-center overflow-hidden flex-shrink-0">
                      {prod.imagen_url ? (
                        <img src={prod.imagen_url} alt="img" className="w-full h-full object-cover" />
                      ) : (
                        <Package size={16} className="text-secondary" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-primary truncate leading-tight">{prod.name}</p>
                      <span className="text-[10px] text-secondary font-mono mt-0.5 block tabular-nums">
                        Base: {prod.price} {prod.currency}
                      </span>
                    </div>

                    <div className="w-24 flex items-center relative">
                      <Input
                        type="number"
                        placeholder="Precio"
                        value={individualPrices[id] || ''}
                        onChange={(e) => handleIndividualPriceChange(id, e.target.value)}
                        className="text-right pr-7 font-mono font-bold !h-9 text-xs"
                      />
                      <span className="absolute right-3 text-[10px] font-mono text-secondary font-bold uppercase">{prod.currency}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Botones de Acción del Modal */}
          <div className="flex gap-3 pt-3 border-t border-border">
            <Button
              variant="secondary"
              onClick={() => setIsImportModalOpen(false)}
              className="flex-1 py-3 font-bold"
              disabled={isImporting}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleImportExecute}
              className="flex-1 py-3 font-bold shadow-lg shadow-accent/15"
              loading={isImporting}
              disabled={!targetCatalogId || selectedProductIds.length === 0}
            >
              Importar
            </Button>
          </div>
        </div>
      </Modal>

    </div>
  );
};
