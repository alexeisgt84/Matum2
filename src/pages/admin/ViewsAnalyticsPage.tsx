import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Eye, 
  Store, 
  ShoppingBag, 
  Users, 
  Share2, 
  Search, 
  RefreshCw, 
  ExternalLink, 
  ChevronDown, 
  ChevronUp, 
  Calendar, 
  Award,
  TrendingUp,
  ArrowLeft
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Input } from '../../components/ui/Input';
import { 
  fetchViewsAnalytics, 
  type AnalyticsData, 
  type StoreAnalyticsItem, 
  type UserAnalyticsItem, 
  type ReferralAnalyticsItem, 
  type ProductAnalyticsItem 
} from '../../lib/analytics';
import { toast } from 'react-hot-toast';

type TabType = 'stores' | 'users' | 'referrals' | 'products';
type DateRangeType = 'all' | 'today' | '7d' | '30d';

export const ViewsAnalyticsPage: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('stores');
  const [dateRange, setDateRange] = useState<DateRangeType>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedStoreId, setExpandedStoreId] = useState<string | null>(null);

  const loadData = async (range = dateRange, isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      const result = await fetchViewsAnalytics(range);
      setData(result);
      if (isManual) {
        toast.success('Métricas actualizadas');
      }
    } catch (err: any) {
      console.error('Error cargando analíticas:', err);
      toast.error('Error al cargar métricas de vistas');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData(dateRange);
  }, [dateRange]);

  const handleRangeChange = (range: DateRangeType) => {
    setDateRange(range);
  };

  const toggleStoreExpand = (storeId: string) => {
    setExpandedStoreId(prev => (prev === storeId ? null : storeId));
  };

  // Filtrado de Tiendas
  const filteredStores = useMemo(() => {
    if (!data?.byStore) return [];
    const term = searchTerm.toLowerCase().trim();
    if (!term) return data.byStore;
    return data.byStore.filter(s => 
      s.catalogName.toLowerCase().includes(term) ||
      (s.slug && s.slug.toLowerCase().includes(term)) ||
      s.ownerName.toLowerCase().includes(term) ||
      s.ownerPhone.includes(term)
    );
  }, [data?.byStore, searchTerm]);

  // Filtrado de Usuarios
  const filteredUsers = useMemo(() => {
    if (!data?.byUser) return [];
    const term = searchTerm.toLowerCase().trim();
    if (!term) return data.byUser;
    return data.byUser.filter(u => 
      u.userName.toLowerCase().includes(term) ||
      u.phone.includes(term) ||
      (u.referralCode && u.referralCode.toLowerCase().includes(term))
    );
  }, [data?.byUser, searchTerm]);

  // Filtrado de Referidos
  const filteredReferrals = useMemo(() => {
    if (!data?.byReferral) return [];
    const term = searchTerm.toLowerCase().trim();
    if (!term) return data.byReferral;
    return data.byReferral.filter(r => 
      r.code.toLowerCase().includes(term) ||
      r.affiliateName.toLowerCase().includes(term) ||
      (r.affiliatePhone && r.affiliatePhone.includes(term))
    );
  }, [data?.byReferral, searchTerm]);

  // Filtrado de Productos
  const filteredProducts = useMemo(() => {
    if (!data?.byProduct) return [];
    const term = searchTerm.toLowerCase().trim();
    if (!term) return data.byProduct;
    return data.byProduct.filter(p => 
      p.name.toLowerCase().includes(term) ||
      p.catalogName.toLowerCase().includes(term) ||
      p.ownerName.toLowerCase().includes(term)
    );
  }, [data?.byProduct, searchTerm]);

  return (
    <div className="p-4 max-w-4xl mx-auto pb-28 space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/admin')}
            className="p-2 rounded-xl bg-surface hover:bg-surface-hover border border-border text-secondary hover:text-primary transition-all active:scale-95"
            title="Volver a Admin"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-primary">Métricas de Vistas</h1>
            <p className="text-xs text-secondary">Contador de tiendas, productos y referidos</p>
          </div>
        </div>
        <PageHeader
          title="Métricas de Vistas"
          subtitle="Contador de visualizaciones de tiendas, productos y referidos"
          onBack={() => navigate('/admin')}
        />

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => loadData(dateRange, true)}
            disabled={refreshing || loading}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold bg-surface hover:bg-surface-hover border border-border text-primary transition-all active:scale-95 disabled:opacity-50"
            title="Recargar datos"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin text-accent' : ''} />
            <span>Actualizar</span>
          </button>
        </div>
      </div>

      {/* Selector de Rango de Fecha */}
      <div className="flex items-center justify-between flex-wrap gap-2 bg-surface p-1.5 rounded-2xl border border-border">
        <div className="flex items-center gap-1.5 text-xs text-secondary px-2">
          <Calendar size={14} />
          <span className="font-medium">Período:</span>
        </div>
        <div className="flex items-center gap-1">
          {(
            [
              { key: 'all', label: 'Todo el tiempo' },
              { key: 'today', label: 'Hoy' },
              { key: '7d', label: 'Últimos 7 días' },
              { key: '30d', label: 'Últimos 30 días' },
            ] as const
          ).map(range => (
            <button
              key={range.key}
              onClick={() => handleRangeChange(range.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                dateRange === range.key
                  ? 'bg-accent text-white shadow-sm'
                  : 'text-secondary hover:text-primary hover:bg-surface-hover'
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tarjetas de Resumen Global */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total Vistas a Tiendas */}
        <div className="card p-4 relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-secondary uppercase tracking-wider">
              Vistas Tiendas
            </span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Store size={18} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-primary">
              {loading ? (
                <div className="h-7 w-16 bg-surface-hover animate-pulse rounded" />
              ) : (
                data?.summary.totalStoreViews.toLocaleString() || '0'
              )}
            </div>
            <p className="text-[11px] text-secondary mt-0.5">
              En {data?.summary.activeStoresCount || 0} tiendas activas
            </p>
          </div>
        </div>

        {/* Total Vistas a Productos */}
        <div className="card p-4 relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-secondary uppercase tracking-wider">
              Vistas Productos
            </span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <ShoppingBag size={18} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-primary">
              {loading ? (
                <div className="h-7 w-16 bg-surface-hover animate-pulse rounded" />
              ) : (
                data?.summary.totalProductViews.toLocaleString() || '0'
              )}
            </div>
            <p className="text-[11px] text-secondary mt-0.5">
              En vistas de detalle y fichas
            </p>
          </div>
        </div>

        {/* Total Vistas por Referidos */}
        <div className="card p-4 relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-secondary uppercase tracking-wider">
              Vistas Referidos
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Share2 size={18} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-primary">
              {loading ? (
                <div className="h-7 w-16 bg-surface-hover animate-pulse rounded" />
              ) : (
                data?.summary.totalReferralViews.toLocaleString() || '0'
              )}
            </div>
            <p className="text-[11px] text-secondary mt-0.5">
              Traídas por enlaces de afiliados
            </p>
          </div>
        </div>

        {/* Total Vistas Combinadas */}
        <div className="card p-4 relative overflow-hidden flex flex-col justify-between bg-gradient-to-br from-accent/5 via-surface to-accent/10 border-accent/20">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-accent uppercase tracking-wider">
              Total Tráfico
            </span>
            <div className="p-2 rounded-xl bg-accent text-white shadow-sm">
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-primary">
              {loading ? (
                <div className="h-7 w-16 bg-surface-hover animate-pulse rounded" />
              ) : (
                data?.summary.totalCombinedViews.toLocaleString() || '0'
              )}
            </div>
            <p className="text-[11px] text-secondary mt-0.5">
              Suma global de visualizaciones
            </p>
          </div>
        </div>
      </div>

      {/* Tabs para organizar por Tienda, Usuario, Referidos y Productos */}
      <div className="space-y-4">
        <div className="flex border-b border-border gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setActiveTab('stores')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all border-b-2 whitespace-nowrap ${
              activeTab === 'stores'
                ? 'border-accent text-accent bg-accent/5'
                : 'border-transparent text-secondary hover:text-primary hover:bg-surface-hover'
            }`}
          >
            <Store size={16} />
            <span>Por Tienda</span>
            <span className="ml-1 px-1.5 py-0.5 text-[10px] rounded-full bg-surface-hover text-secondary">
              {data?.byStore.length || 0}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all border-b-2 whitespace-nowrap ${
              activeTab === 'users'
                ? 'border-accent text-accent bg-accent/5'
                : 'border-transparent text-secondary hover:text-primary hover:bg-surface-hover'
            }`}
          >
            <Users size={16} />
            <span>Por Usuarios</span>
            <span className="ml-1 px-1.5 py-0.5 text-[10px] rounded-full bg-surface-hover text-secondary">
              {data?.byUser.length || 0}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('referrals')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all border-b-2 whitespace-nowrap ${
              activeTab === 'referrals'
                ? 'border-accent text-accent bg-accent/5'
                : 'border-transparent text-secondary hover:text-primary hover:bg-surface-hover'
            }`}
          >
            <Share2 size={16} />
            <span>Por Referidos</span>
            <span className="ml-1 px-1.5 py-0.5 text-[10px] rounded-full bg-surface-hover text-secondary">
              {data?.byReferral.length || 0}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('products')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all border-b-2 whitespace-nowrap ${
              activeTab === 'products'
                ? 'border-accent text-accent bg-accent/5'
                : 'border-transparent text-secondary hover:text-primary hover:bg-surface-hover'
            }`}
          >
            <Award size={16} />
            <span>Ranking de Productos</span>
            <span className="ml-1 px-1.5 py-0.5 text-[10px] rounded-full bg-surface-hover text-secondary">
              {data?.byProduct.length || 0}
            </span>
          </button>
        </div>

        {/* Buscador reactivo */}
        <div className="relative">
          <Input
            placeholder={
              activeTab === 'stores'
                ? 'Buscar por nombre de tienda, slug o dueño...'
                : activeTab === 'users'
                ? 'Buscar usuario por nombre, teléfono o código...'
                : activeTab === 'referrals'
                ? 'Buscar por código de referido o afiliado...'
                : 'Buscar por producto, tienda o propietario...'
            }
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-9"
          />
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary pointer-events-none" />
        </div>

        {/* Contenido según pestaña */}
        {loading ? (
          <div className="card p-8 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-secondary font-medium">Calculando métricas y agrupaciones...</p>
          </div>
        ) : (
          <div>
            {/* 1. ORGANIZAR POR TIENDA */}
            {activeTab === 'stores' && (
              <div className="space-y-3">
                {filteredStores.length === 0 ? (
                  <div className="card p-8 text-center text-secondary text-xs">
                    No se encontraron tiendas que coincidan con la búsqueda.
                  </div>
                ) : (
                  filteredStores.map(store => {
                    const isExpanded = expandedStoreId === store.catalogId;
                    return (
                      <div key={store.catalogId} className="card p-0 overflow-hidden transition-all">
                        {/* Cabecera de la tienda */}
                        <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex items-center gap-3 min-w-0">
                            {store.logoUrl ? (
                              <img
                                src={store.logoUrl}
                                alt={store.catalogName}
                                className="w-12 h-12 rounded-xl object-cover border border-border flex-shrink-0"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-xl bg-accent/10 text-accent flex items-center justify-center font-bold flex-shrink-0">
                                <Store size={22} />
                              </div>
                            )}

                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <h4 className="font-bold text-sm text-primary truncate">
                                  {store.catalogName}
                                </h4>
                                {store.slug && (
                                  <a
                                    href={`/${store.slug}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-secondary hover:text-accent transition-colors"
                                    title="Abrir tienda pública"
                                  >
                                    <ExternalLink size={13} />
                                  </a>
                                )}
                              </div>
                              <p className="text-xs text-secondary truncate mt-0.5">
                                Dueño: <span className="font-medium text-primary">{store.ownerName}</span> ({store.ownerPhone})
                              </p>
                              {store.slug && (
                                <span className="inline-block text-[10px] text-accent/80 font-mono mt-0.5">
                                  /{store.slug}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Métricas de la tienda */}
                          <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-3 sm:pt-0 border-border">
                            <div className="text-center sm:text-right">
                              <span className="block text-[10px] text-secondary font-semibold uppercase">
                                Tienda
                              </span>
                              <span className="font-bold text-sm text-primary">
                                {store.storeViews.toLocaleString()}
                              </span>
                            </div>

                            <div className="text-center sm:text-right">
                              <span className="block text-[10px] text-secondary font-semibold uppercase">
                                En Productos
                              </span>
                              <span className="font-bold text-sm text-primary">
                                {store.productViews.toLocaleString()}
                              </span>
                            </div>

                            <div className="text-center sm:text-right bg-accent/5 px-2.5 py-1 rounded-xl border border-accent/15">
                              <span className="block text-[10px] text-accent font-bold uppercase">
                                Total Vistas
                              </span>
                              <span className="font-black text-base text-accent">
                                {store.totalViews.toLocaleString()}
                              </span>
                            </div>

                            <button
                              onClick={() => toggleStoreExpand(store.catalogId)}
                              className="p-2 rounded-xl hover:bg-surface-hover text-secondary transition-colors"
                              title={isExpanded ? 'Ocultar productos' : 'Ver productos de esta tienda'}
                            >
                              {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                            </button>
                          </div>
                        </div>

                        {/* Desglose de productos de la tienda (Acordeón) */}
                        {isExpanded && (
                          <div className="bg-surface-hover/50 p-4 border-t border-border space-y-2">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-bold text-secondary uppercase tracking-wider">
                                Productos de {store.catalogName} ({store.products.length})
                              </span>
                              <span className="text-[11px] text-secondary">
                                Ordenados por más vistos
                              </span>
                            </div>

                            {store.products.length === 0 ? (
                              <p className="text-xs text-secondary italic py-2">
                                Esta tienda aún no tiene productos registrados.
                              </p>
                            ) : (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {store.products.map((prod, idx) => (
                                  <div
                                    key={prod.id}
                                    className="bg-surface p-2.5 rounded-xl border border-border flex items-center justify-between gap-3"
                                  >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                      <span className="text-[10px] font-bold text-secondary w-4 text-center">
                                        #{idx + 1}
                                      </span>
                                      {prod.imageUrl ? (
                                        <img
                                          src={prod.imageUrl}
                                          alt={prod.name}
                                          className="w-9 h-9 rounded-lg object-cover border border-border flex-shrink-0"
                                        />
                                      ) : (
                                        <div className="w-9 h-9 rounded-lg bg-surface-hover flex items-center justify-center text-secondary flex-shrink-0">
                                          <ShoppingBag size={14} />
                                        </div>
                                      )}
                                      <div className="min-w-0">
                                        <p className="font-medium text-xs text-primary truncate leading-tight">
                                          {prod.name}
                                        </p>
                                        <p className="text-[10px] text-secondary mt-0.5">
                                          {prod.price ? `${prod.price} ${prod.currency}` : 'Sin precio'}
                                        </p>
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-1.5 flex-shrink-0 pl-2">
                                      <Eye size={13} className="text-accent" />
                                      <span className="font-bold text-xs text-primary">
                                        {prod.viewsCount.toLocaleString()}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* 2. ORGANIZAR POR USUARIOS */}
            {activeTab === 'users' && (
              <div className="space-y-3">
                {filteredUsers.length === 0 ? (
                  <div className="card p-8 text-center text-secondary text-xs">
                    No se encontraron usuarios que coincidan con la búsqueda.
                  </div>
                ) : (
                  filteredUsers.map(user => (
                    <div key={user.userId} className="card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-11 h-11 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-sm flex-shrink-0">
                          {user.userName.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-sm text-primary truncate">
                              {user.userName}
                            </h4>
                            <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-surface-hover text-secondary">
                              {user.plan}
                            </span>
                            {user.role === 'admin' && (
                              <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-purple-500/10 text-purple-600">
                                Admin
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-secondary mt-0.5">
                            Tel: <span className="font-medium text-primary">{user.phone}</span>
                            {user.referralCode && (
                              <span className="ml-2 text-accent font-mono text-[11px]">
                                @{user.referralCode}
                              </span>
                            )}
                          </p>
                          <p className="text-[11px] text-secondary mt-0.5">
                            {user.storesCount} {user.storesCount === 1 ? 'tienda' : 'tiendas'} · {user.productsCount} productos
                          </p>
                        </div>
                      </div>

                      {/* Métricas acumuladas del usuario */}
                      <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-3 sm:pt-0 border-border">
                        <div className="text-center sm:text-right">
                          <span className="block text-[10px] text-secondary font-semibold uppercase">
                            Vistas Tiendas
                          </span>
                          <span className="font-bold text-sm text-primary">
                            {user.storeViews.toLocaleString()}
                          </span>
                        </div>

                        <div className="text-center sm:text-right">
                          <span className="block text-[10px] text-secondary font-semibold uppercase">
                            Vistas Productos
                          </span>
                          <span className="font-bold text-sm text-primary">
                            {user.productViews.toLocaleString()}
                          </span>
                        </div>

                        <div className="text-center sm:text-right bg-accent/5 px-3 py-1.5 rounded-xl border border-accent/15">
                          <span className="block text-[10px] text-accent font-bold uppercase">
                            Total Tráfico
                          </span>
                          <span className="font-black text-base text-accent">
                            {user.totalViews.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* 3. ORGANIZAR POR REFERIDOS */}
            {activeTab === 'referrals' && (
              <div className="space-y-3">
                {filteredReferrals.length === 0 ? (
                  <div className="card p-8 text-center text-secondary text-xs">
                    No se registraron datos de referidos aún.
                  </div>
                ) : (
                  filteredReferrals.map(ref => (
                    <div key={ref.code} className="card p-4 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                            ref.isDirect 
                              ? 'bg-surface-hover text-secondary' 
                              : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          }`}>
                            {ref.isDirect ? <Store size={18} /> : <Share2 size={18} />}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-sm text-primary truncate">
                                {ref.isDirect ? ref.code : `@${ref.code}`}
                              </h4>
                              {ref.isDirect ? (
                                <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold uppercase bg-surface-hover text-secondary">
                                  Tráfico Directo
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-600">
                                  Referido
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-secondary mt-0.5">
                              Promotor: <span className="font-medium text-primary">{ref.affiliateName}</span>
                              {ref.affiliatePhone && ` (${ref.affiliatePhone})`}
                            </p>
                          </div>
                        </div>

                        {/* Totales del referido */}
                        <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-3 sm:pt-0 border-border">
                          <div className="text-center sm:text-right">
                            <span className="block text-[10px] text-secondary font-semibold uppercase">
                              A Tiendas
                            </span>
                            <span className="font-bold text-sm text-primary">
                              {ref.storeViews.toLocaleString()}
                            </span>
                          </div>

                          <div className="text-center sm:text-right">
                            <span className="block text-[10px] text-secondary font-semibold uppercase">
                              A Productos
                            </span>
                            <span className="font-bold text-sm text-primary">
                              {ref.productViews.toLocaleString()}
                            </span>
                          </div>

                          <div className="text-center sm:text-right bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20">
                            <span className="block text-[10px] text-emerald-600 font-bold uppercase">
                              Total Traído
                            </span>
                            <span className="font-black text-base text-emerald-600 dark:text-emerald-400">
                              {ref.totalViews.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Tiendas impactadas por este referido */}
                      {ref.catalogsTargeted.length > 0 && (
                        <div className="pt-2 border-t border-border flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-bold text-secondary uppercase">
                            Tiendas promocionadas:
                          </span>
                          {ref.catalogsTargeted.map(cat => (
                            <span
                              key={cat.id}
                              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-xs bg-surface-hover text-primary border border-border"
                            >
                              <span>{cat.name}</span>
                              <span className="text-[10px] font-bold text-accent">
                                ({cat.views})
                              </span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* 4. RANKING DE PRODUCTOS */}
            {activeTab === 'products' && (
              <div className="space-y-2">
                {filteredProducts.length === 0 ? (
                  <div className="card p-8 text-center text-secondary text-xs">
                    No se encontraron productos registrados.
                  </div>
                ) : (
                  filteredProducts.map((prod, idx) => (
                    <div
                      key={prod.id}
                      className="card p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-surface-hover/30 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`w-6 text-center font-black text-xs ${
                          idx === 0 ? 'text-amber-500' : idx === 1 ? 'text-slate-400' : idx === 2 ? 'text-amber-700' : 'text-secondary'
                        }`}>
                          #{idx + 1}
                        </span>

                        {prod.imageUrl ? (
                          <img
                            src={prod.imageUrl}
                            alt={prod.name}
                            className="w-12 h-12 rounded-xl object-cover border border-border flex-shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-surface-hover flex items-center justify-center text-secondary flex-shrink-0">
                            <ShoppingBag size={20} />
                          </div>
                        )}

                        <div className="min-w-0">
                          <h4 className="font-bold text-sm text-primary truncate">
                            {prod.name}
                          </h4>
                          <p className="text-xs text-secondary mt-0.5">
                            Tienda: <span className="font-medium text-primary">{prod.catalogName}</span>
                            {prod.catalogSlug && (
                              <a
                                href={`/${prod.catalogSlug}/p/${prod.id}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-block ml-1 text-secondary hover:text-accent align-middle"
                                title="Ver producto público"
                              >
                                <ExternalLink size={11} />
                              </a>
                            )}
                          </p>
                          <p className="text-[11px] text-secondary">
                            Dueño: {prod.ownerName}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-2 sm:pt-0 border-border">
                        <div className="text-left sm:text-right">
                          <span className="block text-[10px] text-secondary font-semibold uppercase">
                            Precio
                          </span>
                          <span className="font-bold text-xs text-primary">
                            {prod.price ? `${prod.price} ${prod.currency}` : 'Sin precio'}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 bg-purple-500/10 px-3 py-1.5 rounded-xl border border-purple-500/20">
                          <Eye size={15} className="text-purple-600 dark:text-purple-400" />
                          <div className="text-right">
                            <span className="block text-[9px] text-purple-600 dark:text-purple-400 font-bold uppercase leading-none">
                              Vistas
                            </span>
                            <span className="font-black text-sm text-purple-600 dark:text-purple-400 leading-tight">
                              {prod.viewsCount.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
