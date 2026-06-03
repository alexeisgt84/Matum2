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
  Layers,
  Search,
  ArrowUpDown,
  Sparkles,
  UserPlus
} from 'lucide-react';
import { useCollaboration } from '../../hooks/useCollaboration';
import type { Catalog } from '../../types/catalog';
import type { Product } from '../../types/product';

interface FollowedCatalogItem {
  id: string;
  catalog_id: string;
  created_at: string;
  catalogs: Catalog & { productCount?: number };
}

interface EnrichedProduct extends Product {
  catalog_name: string;
  catalog_logo_url: string;
}

export const FollowedCatalogsPage = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  
  const { pendingFollowRequests, getPendingFollowRequests, respondToFollowRequest } = useCollaboration();

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

  // Estados para búsqueda y ordenamiento de catálogos (Vista A)
  const [searchQueryCatalog, setSearchQueryCatalog] = useState('');
  const [sortCatalogBy, setSortCatalogBy] = useState<'date' | 'name_asc' | 'name_desc' | 'products_desc' | 'price_asc' | 'price_desc'>('date');
  const [isFollowModalOpen, setIsFollowModalOpen] = useState(false);
  const [allProducts, setAllProducts] = useState<EnrichedProduct[]>([]);

  // Estados para búsqueda y ordenamiento de productos (Vista B)
  const [searchQueryProduct, setSearchQueryProduct] = useState('');
  const [sortProductBy, setSortProductBy] = useState<'position' | 'name_asc' | 'name_desc' | 'price_asc' | 'price_desc'>('position');

  useEffect(() => {
    fetchFollowedCatalogs();
    getMyCatalogs();
    getPendingFollowRequests();
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
        .eq('status', 'accepted')
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

      // 3. Cargar productos de todos los catálogos seguidos para búsqueda global
      if (data && data.length > 0) {
        const catalogIds = data.map(item => item.catalog_id);
        const { data: productsData, error: productsError } = await supabase
          .from('products')
          .select('*')
          .in('catalog_id', catalogIds)
          .eq('is_active', true);

        if (productsError) throw productsError;

        const enrichedProducts = (productsData || []).map(prod => {
          const matchedCatalog = formattedData.find(item => item.catalog_id === prod.catalog_id)?.catalogs;
          return {
            ...prod,
            catalog_name: matchedCatalog?.name || '',
            catalog_logo_url: matchedCatalog?.logo_url || ''
          };
        });
        setAllProducts(enrichedProducts);
      } else {
        setAllProducts([]);
      }
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
      setIsFollowModalOpen(false); // Cerrar el modal
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
    setSearchQueryProduct(''); // Limpiar búsqueda de productos al entrar
    setSortProductBy('position'); // Restablecer orden al entrar
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

  // Seleccionar o deseleccionar todos los productos (considera filtrado)
  const handleSelectAll = () => {
    const visibleIds = filteredAndSortedProducts.map(p => p.id);
    const areAllVisibleSelected = visibleIds.every(id => selectedProductIds.includes(id));
    
    if (areAllVisibleSelected) {
      setSelectedProductIds(prev => prev.filter(id => !visibleIds.includes(id)));
    } else {
      setSelectedProductIds(prev => {
        const newSelection = [...prev];
        visibleIds.forEach(id => {
          if (!newSelection.includes(id)) {
            newSelection.push(id);
          }
        });
        return newSelection;
      });
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
          is_active: sourceProd.is_active,
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

  // Catálogos filtrados y ordenados
  const filteredAndSortedFollowed = followed
    .filter(item => {
      if (!searchQueryCatalog) return true;
      const query = searchQueryCatalog.toLowerCase();
      const catalogName = item.catalogs?.name?.toLowerCase() || '';
      const catalogDesc = item.catalogs?.description?.toLowerCase() || '';
      const catalogCode = item.catalogs?.follow_code?.toLowerCase() || '';
      return catalogName.includes(query) || catalogDesc.includes(query) || catalogCode.includes(query);
    })
    .sort((a, b) => {
      if (sortCatalogBy === 'name_asc') {
        return (a.catalogs?.name || '').localeCompare(b.catalogs?.name || '');
      }
      if (sortCatalogBy === 'name_desc') {
        return (b.catalogs?.name || '').localeCompare(a.catalogs?.name || '');
      }
      if (sortCatalogBy === 'products_desc') {
        return (b.catalogs?.productCount || 0) - (a.catalogs?.productCount || 0);
      }
      // 'date' -> por fecha de creación de seguimiento (orden descendente)
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  // Productos de búsqueda global filtrados y ordenados
  const filteredAndSortedGlobalProducts = allProducts
    .filter(product => {
      if (!searchQueryCatalog) return false;
      const query = searchQueryCatalog.toLowerCase();
      const prodName = product.name?.toLowerCase() || '';
      const prodDesc = product.description?.toLowerCase() || '';
      return prodName.includes(query) || prodDesc.includes(query);
    })
    .sort((a, b) => {
      if (sortCatalogBy === 'name_asc') {
        return (a.name || '').localeCompare(b.name || '');
      }
      if (sortCatalogBy === 'name_desc') {
        return (b.name || '').localeCompare(a.name || '');
      }
      if (sortCatalogBy === 'price_asc') {
        return (a.price || 0) - (b.price || 0);
      }
      if (sortCatalogBy === 'price_desc') {
        return (b.price || 0) - (a.price || 0);
      }
      // Por defecto al buscar, ordenar por precio menor a mayor para comparar
      return (a.price || 0) - (b.price || 0);
    });

  // Productos filtrados y ordenados
  const filteredAndSortedProducts = catalogProducts
    .filter(product => {
      if (!searchQueryProduct) return true;
      const query = searchQueryProduct.toLowerCase();
      const prodName = product.name?.toLowerCase() || '';
      const prodDesc = product.description?.toLowerCase() || '';
      return prodName.includes(query) || prodDesc.includes(query);
    })
    .sort((a, b) => {
      if (sortProductBy === 'name_asc') {
        return (a.name || '').localeCompare(b.name || '');
      }
      if (sortProductBy === 'name_desc') {
        return (b.name || '').localeCompare(a.name || '');
      }
      if (sortProductBy === 'price_asc') {
        return (a.price || 0) - (b.price || 0);
      }
      if (sortProductBy === 'price_desc') {
        return (b.price || 0) - (a.price || 0);
      }
      // 'position' (default)
      return (a.position || 0) - (b.position || 0);
    });

  const handleCatalogSearchChange = (value: string) => {
    setSearchQueryCatalog(value);
    if (value && !searchQueryCatalog) {
      setSortCatalogBy('price_asc');
    } else if (!value) {
      setSortCatalogBy('date');
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
            rightAction={
              <Button
                variant="secondary"
                size="sm"
                icon={Plus}
                onClick={() => setIsFollowModalOpen(true)}
                className="!p-2 h-9 w-9 rounded-xl flex items-center justify-center border-border/80 text-primary hover:bg-surface-hover"
                title="Seguir catálogo"
              />
            }
          />

          {/* Solicitudes de Seguimiento Pendientes */}
          {pendingFollowRequests.length > 0 && (
            <div className="space-y-3 bg-accent/5 border border-accent/15 p-4 rounded-2xl animate-in slide-in-from-top duration-300">
              <h4 className="text-[10px] font-black uppercase tracking-wider text-accent flex items-center gap-1.5">
                <Sparkles size={12} />
                Solicitudes de Seguimiento ({pendingFollowRequests.length})
              </h4>
              <div className="space-y-2">
                {pendingFollowRequests.map((req: any) => (
                  <div key={req.id} className="flex justify-between items-center bg-surface p-3 rounded-xl border border-border">
                    <div className="min-w-0 flex-1 pr-3">
                      <p className="font-bold text-primary text-[10px] uppercase tracking-wider">
                        Invitación para seguir:
                      </p>
                      <p className="text-accent text-xs font-bold truncate mt-0.5">
                        {req.catalog?.name}
                      </p>
                      <p className="text-secondary text-[10px] truncate mt-0.5">
                        {req.catalog?.description || 'Sin descripción'}
                      </p>
                    </div>
                    <div className="flex gap-1.5 flex-shrink-0">
                      <Button 
                        size="sm" 
                        className="!py-1 px-3 text-[10px] h-7"
                        onClick={async () => {
                          const success = await respondToFollowRequest(req.id, 'accepted');
                          if (success) {
                            fetchFollowedCatalogs();
                          }
                        }}
                      >
                        Aceptar
                      </Button>
                      <Button 
                        variant="secondary" 
                        size="sm" 
                        className="!py-1 px-3 text-[10px] h-7 border-border hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/20"
                        onClick={() => respondToFollowRequest(req.id, 'rejected')}
                      >
                        Rechazar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

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
            <div className="space-y-4">
              {/* Buscador y Ordenamiento */}
              <div className="flex gap-2 items-center w-full bg-surface border border-border p-2 rounded-2xl">
                <div className="relative flex-1">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary" />
                  <Input
                    placeholder="Buscar catálogo o productos..."
                    value={searchQueryCatalog}
                    onChange={(e) => handleCatalogSearchChange(e.target.value)}
                    className="pl-9 pr-14 w-full bg-transparent border-0 focus:ring-0 !h-9 text-xs"
                  />
                  {searchQueryCatalog && (
                    <button 
                      onClick={() => handleCatalogSearchChange('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] uppercase font-bold text-accent hover:text-accent-hover transition-colors"
                    >
                      Limpiar
                    </button>
                  )}
                </div>
                <div className="relative flex-shrink-0">
                  <select
                    value={sortCatalogBy}
                    onChange={(e) => setSortCatalogBy(e.target.value as any)}
                    className="appearance-none bg-background border border-border rounded-xl h-9 pl-3 pr-8 text-[11px] font-bold text-secondary focus:border-accent focus:outline-none transition-colors cursor-pointer"
                  >
                    {searchQueryCatalog ? (
                      <>
                        <option value="price_asc">Precio (Menor a Mayor)</option>
                        <option value="price_desc">Precio (Mayor a Menor)</option>
                        <option value="name_asc">Nombre (A-Z)</option>
                        <option value="name_desc">Nombre (Z-A)</option>
                      </>
                    ) : (
                      <>
                        <option value="date">Más recientes</option>
                        <option value="name_asc">Nombre (A-Z)</option>
                        <option value="name_desc">Nombre (Z-A)</option>
                        <option value="products_desc">Más productos</option>
                      </>
                    )}
                  </select>
                  <ArrowUpDown size={11} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-secondary pointer-events-none" />
                </div>
              </div>

              {searchQueryCatalog ? (
                // BÚSQUEDA GLOBAL DE PRODUCTOS PARA COMPARACIÓN DE PRECIOS
                filteredAndSortedGlobalProducts.length === 0 ? (
                  <EmptyState
                    icon={Package}
                    title="No se encontraron productos"
                    description="Prueba con otros términos (por ejemplo: 'Zapatos', 'Remera') o limpia la búsqueda."
                  />
                ) : (
                  <div className="space-y-4 w-full animate-in fade-in duration-200">
                    {/* Botón de importación masiva en búsqueda global */}
                    {selectedProductIds.length > 0 && (
                      <div className="flex justify-between items-center bg-accent/5 border border-accent/15 p-3 rounded-2xl animate-in slide-in-from-top duration-300">
                        <span className="text-[10px] text-accent font-bold uppercase tracking-wider">
                          {selectedProductIds.length} seleccionados para importar
                        </span>
                        <Button 
                          size="sm" 
                          onClick={handleOpenImportModal}
                          className="px-4 shadow-lg shadow-accent/15"
                        >
                          Importar seleccionados
                        </Button>
                      </div>
                    )}

                    <div className="flex items-center justify-between px-1">
                      <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-secondary">
                        Productos encontrados ({filteredAndSortedGlobalProducts.length})
                      </h2>
                      {filteredAndSortedGlobalProducts.length > 0 && (
                        <button 
                          onClick={() => {
                            const visibleIds = filteredAndSortedGlobalProducts.map(p => p.id);
                            const areAllVisibleSelected = visibleIds.every(id => selectedProductIds.includes(id));
                            if (areAllVisibleSelected) {
                              setSelectedProductIds(prev => prev.filter(id => !visibleIds.includes(id)));
                            } else {
                              setSelectedProductIds(prev => {
                                const newSelection = [...prev];
                                visibleIds.forEach(id => {
                                  if (!newSelection.includes(id)) {
                                    newSelection.push(id);
                                  }
                                });
                                return newSelection;
                              });
                            }
                          }}
                          className="text-[10px] bg-surface-hover hover:bg-surface text-secondary hover:text-primary px-3 py-1.5 rounded-xl border border-border transition-all font-bold uppercase tracking-wider"
                        >
                          {filteredAndSortedGlobalProducts.every(p => selectedProductIds.includes(p.id)) ? 'Ninguno' : 'Todos'}
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 gap-3 w-full">
                      {filteredAndSortedGlobalProducts.map((product) => {
                        const isSelected = selectedProductIds.includes(product.id);
                        return (
                          <div 
                            key={product.id}
                            onClick={() => toggleSelectProduct(product.id)}
                            className={`card p-4 flex items-center gap-4 cursor-pointer transition-all border w-full relative overflow-hidden group ${
                              isSelected 
                                ? 'border-accent bg-accent/5' 
                                : 'border-border hover:border-accent/20 bg-surface'
                            }`}
                          >
                            <div className="flex items-center justify-center z-10">
                              <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${
                                isSelected ? 'border-accent bg-accent text-black' : 'border-border bg-transparent'
                              }`}>
                                {isSelected && <CheckCircle size={14} strokeWidth={3} />}
                              </div>
                            </div>

                            <div className="w-16 h-16 rounded-xl bg-surface border border-border flex items-center justify-center overflow-hidden flex-shrink-0 z-10">
                              {product.imagen_url ? (
                                <img src={product.imagen_url} alt={product.name} className="w-full h-full object-cover" />
                              ) : (
                                <Package size={22} className="text-secondary" />
                              )}
                            </div>

                            <div className="flex-1 min-w-0 z-10">
                              <h4 className="font-bold text-primary truncate leading-tight group-hover:text-accent transition-colors">{product.name}</h4>
                              <p className="text-secondary text-[11px] truncate mt-1">{product.description || 'Sin descripción'}</p>
                              
                              <div className="flex items-center gap-2 mt-2">
                                <span className="text-accent text-xs font-bold font-mono tabular-nums">
                                  {product.price} {product.currency}
                                </span>
                                
                                {/* Chip del catálogo origen */}
                                <div 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const matchedCatalog = followed.find(item => item.catalog_id === product.catalog_id)?.catalogs;
                                    if (matchedCatalog) {
                                      handleViewCatalogProducts(matchedCatalog);
                                    }
                                  }}
                                  className="flex items-center gap-1.5 bg-background border border-border/80 px-2 py-0.5 rounded-lg hover:border-accent/30 transition-colors"
                                  title="Ver catálogo de origen"
                                >
                                  {product.catalog_logo_url ? (
                                    <img src={product.catalog_logo_url} alt="store logo" className="w-3.5 h-3.5 object-cover rounded-full" />
                                  ) : (
                                    <ShoppingBag size={10} className="text-secondary" />
                                  )}
                                  <span className="text-[9px] text-secondary font-bold truncate max-w-[80px]">
                                    {product.catalog_name}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {product.is_out_of_stock && (
                              <span className="text-[8px] bg-red-500/10 text-red-500 border border-red-500/20 px-2 py-0.5 rounded-lg font-black uppercase tracking-wider z-10">
                                Agotado
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )
              ) : (
                // LISTADO TRADICIONAL DE CATÁLOGOS SEGUIDOS (Búsqueda vacía)
                filteredAndSortedFollowed.length === 0 ? (
                  <EmptyState
                    icon={Bookmark}
                    title="No se encontraron resultados"
                    description="Intenta buscar con otros términos o limpia el filtro de búsqueda."
                  />
                ) : (
                  <div className="space-y-3">
                    <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-secondary px-1">
                      Catálogos que sigo ({filteredAndSortedFollowed.length})
                    </h2>
                    {filteredAndSortedFollowed.map((item) => (
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
                )
              )}
            </div>
          )}
        </>
      ) : (
        /* VISTA B: DETALLE DE PRODUCTOS DEL CATÁLOGO SEGUIDO */
        <div className="space-y-6 animate-in fade-in duration-300">
          
          {/* Header de navegación interna */}
          <div className="flex items-center justify-between border-b border-border pb-4 bg-background">
            <button 
              onClick={() => {
                setActiveCatalog(null);
                setSearchQueryCatalog('');
                setSortCatalogBy('date');
                setSearchQueryProduct('');
                setSortProductBy('position');
              }}
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
            {/* Buscador y Ordenamiento de Productos */}
            {catalogProducts.length > 0 && (
              <div className="flex gap-2 items-center w-full bg-surface border border-border p-2 rounded-2xl">
                <div className="relative flex-1">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary" />
                  <Input
                    placeholder="Buscar producto por título..."
                    value={searchQueryProduct}
                    onChange={(e) => setSearchQueryProduct(e.target.value)}
                    className="pl-9 pr-14 w-full bg-transparent border-0 focus:ring-0 !h-9 text-xs"
                  />
                  {searchQueryProduct && (
                    <button 
                      onClick={() => setSearchQueryProduct('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] uppercase font-bold text-accent hover:text-accent-hover transition-colors"
                    >
                      Limpiar
                    </button>
                  )}
                </div>
                <div className="relative flex-shrink-0">
                  <select
                    value={sortProductBy}
                    onChange={(e) => setSortProductBy(e.target.value as any)}
                    className="appearance-none bg-background border border-border rounded-xl h-9 pl-3 pr-8 text-[11px] font-bold text-secondary focus:border-accent focus:outline-none transition-colors cursor-pointer"
                  >
                    <option value="position">Orden original</option>
                    <option value="name_asc">Nombre (A-Z)</option>
                    <option value="name_desc">Nombre (Z-A)</option>
                    <option value="price_asc">Precio (Menor a Mayor)</option>
                    <option value="price_desc">Precio (Mayor a Menor)</option>
                  </select>
                  <ArrowUpDown size={11} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-secondary pointer-events-none" />
                </div>
              </div>
            )}

            <div className="flex items-center justify-between px-1">
              <div className="flex flex-col">
                <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-secondary">Productos del origen</h3>
                <span className="text-[10px] text-secondary font-bold tabular-nums">
                  {filteredAndSortedProducts.length} de {catalogProducts.length} disponibles · {selectedProductIds.length} seleccionados
                </span>
              </div>
              
              {catalogProducts.length > 0 && (
                <div className="flex gap-2">
                  <button 
                    onClick={handleSelectAll}
                    className="text-[10px] bg-surface-hover hover:bg-surface text-secondary hover:text-primary px-3 py-1.5 rounded-xl border border-border transition-all font-bold uppercase tracking-wider"
                  >
                    {filteredAndSortedProducts.every(p => selectedProductIds.includes(p.id)) ? 'Ninguno' : 'Todos'}
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
            ) : filteredAndSortedProducts.length === 0 ? (
              <EmptyState
                icon={Package}
                title={searchQueryProduct ? "No se encontraron resultados" : "Catálogo vacío"}
                description={searchQueryProduct ? "Intenta buscar con otros términos o limpia el filtro de búsqueda." : "Este catálogo seguido no tiene ningún producto público y activo en este momento."}
              />
            ) : (
              <div className="grid grid-cols-1 gap-3 w-full">
                {filteredAndSortedProducts.map((product) => {
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

      {/* MODAL PARA SEGUIR NUEVO CATÁLOGO */}
      <Modal
        isOpen={isFollowModalOpen}
        onClose={() => !isSubmitting && setIsFollowModalOpen(false)}
        title="Seguir nuevo catálogo"
      >
        <form onSubmit={handleFollowSubmit} className="space-y-4 py-2">
          <p className="text-secondary text-xs leading-relaxed">
            Ingresa el código de seguimiento provisto por el administrador de la tienda para vincularla a tu listado.
          </p>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-secondary uppercase tracking-widest block">Código de seguimiento</label>
            <Input
              placeholder="Ej: MAT-7X9B2"
              value={followCode}
              onChange={(e) => setFollowCode(e.target.value)}
              className="uppercase font-mono"
              required
            />
          </div>
          <div className="flex gap-3 pt-3 border-t border-border">
            <Button
              variant="secondary"
              onClick={() => setIsFollowModalOpen(false)}
              className="flex-1 py-3 font-bold"
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              loading={isSubmitting}
              className="flex-1 py-3 font-bold shadow-lg shadow-accent/15"
            >
              Seguir
            </Button>
          </div>
        </form>
      </Modal>

    </div>
  );
};
