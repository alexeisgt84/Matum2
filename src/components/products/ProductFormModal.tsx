import React, { useState, useEffect, useRef } from 'react';
import { BottomSheet } from '../ui/BottomSheet';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import type { Product, ProductForm } from '../../types/product';
import type { Category } from '../../types/category';
import { Save, Tag, Send, Sparkles, Crown, Calculator, Link2Off, Plus, Check, ChevronDown, Settings, Package } from 'lucide-react';
import { CalculatorModal } from '../ui/CalculatorModal';
import { ImageUpload } from '../ui/ImageUpload';
import { toast } from 'react-hot-toast';
import { useProfile } from '../../hooks/useProfile';
import { analyzeProductImage } from '../../lib/aiService';
import { supabase } from '../../lib/supabase';
import { CategoryIcon } from '../ui/CategoryIcon';
import { ManageCategoriesModal } from './ManageCategoriesModal';
import { parseProductText, type DetectedPrice } from '../../lib/priceParser';

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (form: ProductForm, id?: string, file?: File, shouldSend?: boolean) => Promise<boolean>;
  product?: Product | null;
  loading?: boolean;
  prefilledData?: { description?: string; file?: File; preview?: string } | null;
  categories?: Category[];
  catalogId?: string;
  onUnlink?: (product: Product) => Promise<boolean>;
  onCategoryCreated?: (category: Category) => void;
}

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  product,
  loading,
  prefilledData,
  categories = [],
  catalogId,
  onUnlink,
  onCategoryCreated,
}) => {
  const { profile } = useProfile();
  const [form, setForm] = useState<ProductForm>({
    name: '',
    description: '',
    price: '',
    currency: 'USD',
    imagen_url: null,
    category_id: null,
    is_active: true,
  });
  const [localCategories, setLocalCategories] = useState<Category[]>(categories);
  const [isManageCategoriesOpen, setIsManageCategoriesOpen] = useState(false);
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);

  const [file, setFile] = useState<File | undefined>(undefined);
  const [preview, setPreview] = useState<string | null>(null);
  const [calculatorOpen, setCalculatorOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [parentProductId, setParentProductId] = useState<string | null>(null);
  const [detectedPrices, setDetectedPrices] = useState<DetectedPrice[]>([]);

  useEffect(() => {
    setLocalCategories(categories);
  }, [categories]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target as Node)) {
        setIsCategoryDropdownOpen(false);
      }
    };
    if (isCategoryDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isCategoryDropdownOpen]);

  const handleCategoriesChanged = async () => {
    if (!catalogId) return;
    try {
      const { data } = await supabase
        .from('categories')
        .select('*')
        .eq('catalog_id', catalogId)
        .order('display_order', { ascending: true });
      if (data) {
        setLocalCategories(data);
        if (form.category_id && !data.some(c => c.id === form.category_id)) {
          setForm(prev => ({ ...prev, category_id: null }));
        }
      }
    } catch (e) {
      console.error(e);
    }
    if (onCategoryCreated) {
      onCategoryCreated({} as any);
    }
  };

  const handleCategoryCreatedFromModal = (newCategory: Category) => {
    setLocalCategories(prev => {
      if (prev.some(c => c.id === newCategory.id)) {
        return prev.map(c => c.id === newCategory.id ? newCategory : c);
      }
      return [...prev, newCategory];
    });
    setForm(prev => ({ ...prev, category_id: newCategory.id }));
    if (onCategoryCreated) {
      onCategoryCreated(newCategory);
    }
  };

  const selectedCategory = localCategories.find(c => c.id === form.category_id);

  const handleUnlink = async () => {
    if (!product || !onUnlink) return;
    const success = await onUnlink(product);
    if (success) {
      setParentProductId(null);
    }
  };

  const isPremium = profile?.plan === 'premium';

  const runAIAnalysis = async () => {
    let imageBlob: Blob | File | null = file || null;

    // Si no hay archivo local pero hay una URL de preview remota
    if (!imageBlob && preview) {
      setIsAnalyzing(true);
      const toastId = toast.loading('Descargando imagen para análisis...');
      try {
        const response = await fetch(preview);
        const blob = await response.blob();
        imageBlob = blob;
        toast.dismiss(toastId);
      } catch (err) {
        console.error("Error al descargar la imagen remota:", err);
        toast.error('No se pudo recuperar la imagen remota para analizarla.', { id: toastId });
        setIsAnalyzing(false);
        return;
      }
    }

    if (!imageBlob) {
      toast.error('Por favor, añade una foto del producto primero.');
      return;
    }

    if (!profile?.gemini_api_key || profile.gemini_api_key.trim() === '') {
      toast.error('Configura tu API Key de Gemini en tu perfil para usar la IA.');
      return;
    }

    setIsAnalyzing(true);
    const toastId = toast.loading('IA analizando imagen del producto...');
    try {
      const result = await analyzeProductImage(imageBlob);
      
      // Auto-completar título y descripción con los datos devueltos
      setForm(prev => ({
        ...prev,
        name: result.title,
        description: result.description
      }));
      
      toast.success('¡Detalles auto-completados por IA! ✨', { id: toastId });
    } catch (err: any) {
      console.error("AI Analysis failed:", err);
      if (err.message?.includes('NO_API_KEY')) {
        toast.error('Configura tu API Key en tu perfil para usar la IA.', { id: toastId });
      } else {
        toast.error('No se pudo analizar la imagen con la IA', { id: toastId });
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAIClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!isPremium) {
      toast.error('👑 Esta función es exclusiva para usuarios Premium. ¡Actualiza tu plan en tu perfil!', { duration: 5000 });
      return;
    }
    runAIAnalysis();
  };

  useEffect(() => {
    if (product) {
      setForm({
        name: product.name,
        description: product.description || '',
        price: product.price?.toString() || '',
        currency: product.currency || 'USD',
        imagen_url: product.imagen_url,
        category_id: product.category_id || null,
        is_active: product.is_active ?? true,
      });
      setDetectedPrices([]);
      setPreview(product.imagen_url);
      setParentProductId(product.parent_product_id || null);
    } else if (prefilledData) {
      const parsed = parseProductText(prefilledData.description || '');
      setForm({
        name: parsed.suggestedTitle || '',
        description: prefilledData.description || '',
        price: parsed.bestPrice ? parsed.bestPrice.price.toString() : '',
        currency: parsed.bestPrice ? parsed.bestPrice.currency : 'USD',
        imagen_url: null,
        category_id: null,
        is_active: true,
      });
      setDetectedPrices(parsed.allPrices);
      setPreview(prefilledData.preview || null);
      setFile(prefilledData.file);
      setParentProductId(null);
    } else {
      setForm({ name: '', description: '', price: '', currency: 'USD', imagen_url: null, category_id: null, is_active: true });
      setDetectedPrices([]);
      setPreview(null);
      setFile(undefined);
      setParentProductId(null);
    }
    setIsCategoryDropdownOpen(false);
    setIsManageCategoriesOpen(false);
  }, [product, prefilledData, isOpen]);

  useEffect(() => {
    return () => {
      if (preview && preview.startsWith('blob:')) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  const handleSubmit = async (e: React.FormEvent, shouldSend = false) => {
    e?.preventDefault();
    const success = await onSave(form, product?.id, file, shouldSend);
    if (success) onClose();
  };

  return (
    <>
      <BottomSheet
        isOpen={isOpen}
        onClose={onClose}
        icon={Package}
        title={
          <div className="flex items-center gap-2">
            <span>{product ? 'Editar Producto' : 'Nuevo Producto'}</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
              product 
                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' 
                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
            }`}>
              {product ? 'Edición' : 'Nuevo'}
            </span>
          </div>
        }
        subtitle={product ? 'Modifica los detalles, precios o visibilidad' : 'Completa los datos del nuevo producto para tu catálogo'}
        maxWidth="sm:max-w-xl"
        footer={
          <div className="flex flex-col sm:flex-row gap-2.5 w-full">
            <Button 
              type="button"
              variant={product ? "primary" : "secondary"}
              className="flex-1 font-bold py-3 text-sm shadow-md" 
              loading={loading}
              icon={Save}
              onClick={(e) => handleSubmit(e as any, false)}
            >
              {product ? 'Guardar Cambios' : 'Aceptar'}
            </Button>
            {!product && (
              <Button 
                type="button"
                className="flex-1 font-bold py-3 text-sm shadow-md" 
                loading={loading}
                icon={Send}
                onClick={(e) => handleSubmit(e as any, true)}
              >
                Aceptar y enviar
              </Button>
            )}
          </div>
        }
      >
        <form id="product-form" onSubmit={(e) => handleSubmit(e, false)} className="space-y-5 pb-2">
          {/* Sección de Imagen */}
          <div className="p-3.5 rounded-2xl bg-surface-hover/40 border border-border">
            <ImageUpload
              value={preview}
              onChange={(newFile, newPreview) => {
                setFile(newFile);
                setPreview(newPreview);
              }}
              onRemove={() => {
                if (preview && preview.startsWith('blob:')) {
                  URL.revokeObjectURL(preview);
                }
                setFile(undefined);
                setPreview(null);
              }}
              disabled={isAnalyzing}
              label="Añadir Foto"
              filePrefix="product"
              className="mb-1"
              extraActions={
                profile?.gemini_api_key && preview ? (
                  isPremium ? (
                    <button
                      type="button"
                      onClick={handleAIClick}
                      disabled={isAnalyzing}
                      className="flex items-center gap-1.5 py-2 px-4 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white shadow-md shadow-purple-500/15 active:scale-95 transition-all"
                    >
                      <Sparkles size={13} className="text-purple-200 animate-pulse" />
                      <span>Autocompletar con IA ✨</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleAIClick}
                      className="flex items-center gap-1.5 py-2 px-4 rounded-xl text-xs font-bold bg-surface border border-border hover:bg-surface-hover text-secondary transition-all"
                    >
                      <Crown size={13} className="text-amber-400" />
                      <span>Autocompletar con IA (Premium 👑)</span>
                    </button>
                  )
                ) : null
              }
              bottomContent={
                !preview && profile?.gemini_api_key ? (
                  <div className="mt-2 py-1 px-3 rounded-full bg-emerald-500/5 border border-emerald-500/10 text-[10px] text-emerald-400 font-medium flex items-center gap-1.5 justify-center">
                    <Sparkles size={12} className="text-emerald-400 animate-pulse" />
                    <span>Añade una foto para habilitar la IA ✨</span>
                  </div>
                ) : null
              }
            />
          </div>

          <div className="relative space-y-4">
            {/* Overlay de Carga Premium de la IA */}
            {isAnalyzing && (
              <div className="absolute inset-0 bg-black/75 backdrop-blur-[6px] z-30 rounded-2xl flex flex-col items-center justify-center border border-purple-500/30 shadow-2xl p-6">
                <div className="p-3.5 bg-gradient-to-br from-purple-500/20 to-indigo-500/20 text-purple-400 rounded-2xl border border-purple-500/40 mb-3 shadow-lg shadow-purple-500/20 animate-bounce">
                  <Sparkles size={28} className="animate-pulse" />
                </div>
                <span className="text-xs font-bold text-white uppercase tracking-widest bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
                  La IA está leyendo tu imagen...
                </span>
                <span className="text-[10px] text-gray-300 mt-1.5 tracking-wide text-center max-w-[280px]">
                  Analizando los detalles de tu producto para autocompletar el título y descripción sugeridos
                </span>
              </div>
            )}

            {/* Alerta de Producto Vinculado */}
            {parentProductId && (
              <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex flex-col sm:flex-row gap-2.5 items-start sm:items-center justify-between animate-in fade-in duration-300">
                <div className="flex-1">
                  <span className="text-[9px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full font-black uppercase tracking-wider">
                    Importado
                  </span>
                  <p className="text-secondary text-[11px] mt-1 leading-relaxed font-medium">
                    Este producto está vinculado a un catálogo de origen. Las actualizaciones se sincronizan automáticamente.
                  </p>
                </div>
                {onUnlink && (
                  <button
                    type="button"
                    onClick={handleUnlink}
                    className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-orange-400 hover:text-orange-500 bg-orange-500/10 hover:bg-orange-500/20 px-3 py-1.5 rounded-xl border border-orange-500/20 transition-colors shrink-0 shadow-sm"
                  >
                    <Link2Off size={12} />
                    <span>Desvincular</span>
                  </button>
                )}
              </div>
            )}

            {/* Nombre del Producto */}
            <Input
              label="Nombre del Producto"
              placeholder="Ej: Pizza Margherita Especial"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              autoFocus
              disabled={isAnalyzing}
            />

            {/* Precio, Moneda y Calculadora */}
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <Input
                  label="Precio"
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={form.price}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '' || /^\d*\.?\d*$/.test(val)) {
                      setForm({ ...form, price: val });
                    }
                  }}
                  icon={Tag}
                  disabled={isAnalyzing}
                  rightElement={
                    <button
                      type="button"
                      onClick={() => setCalculatorOpen(true)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg bg-surface hover:bg-surface-hover border border-border text-secondary hover:text-primary transition-colors active:scale-95 shadow-sm"
                      title="Abrir calculadora"
                    >
                      <Calculator size={16} />
                    </button>
                  }
                />
              </div>
              <div>
                <Select
                  label="Moneda"
                  value={form.currency}
                  onChange={(e) => setForm({ ...form, currency: e.target.value })}
                  disabled={isAnalyzing}
                >
                  <option value="USD" className="bg-surface text-primary">USD</option>
                  <option value="CUP" className="bg-surface text-primary">CUP</option>
                </Select>
              </div>
            </div>

            {/* Sugerencias de Precios Detectados */}
            {detectedPrices.length > 0 && (
              <div className="flex flex-col gap-2 p-3 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-xs animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-purple-300 font-bold text-[11px]">
                    <Sparkles size={13} className="text-purple-400" />
                    Precios detectados en el texto:
                  </span>
                  <span className="text-[10px] text-gray-400 font-medium">Toca para aplicar</span>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {detectedPrices.map((item, idx) => {
                    const isSelected = form.price.toString() === item.price.toString() && form.currency === item.currency;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setForm(prev => ({
                            ...prev,
                            price: item.price.toString(),
                            currency: item.currency,
                          }));
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 ${
                          isSelected
                            ? 'bg-purple-500 text-white shadow-sm shadow-purple-500/30 ring-2 ring-purple-400/50'
                            : 'bg-surface hover:bg-surface-hover text-secondary border border-border'
                        }`}
                      >
                        <span>{item.price.toLocaleString()} {item.currency}</span>
                        {isSelected && <Check size={12} className="stroke-[3]" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Selector de Categoría con Icono */}
            <div className="space-y-1.5 relative" ref={categoryDropdownRef}>
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-secondary uppercase tracking-wider ml-1">Categoría (Opcional)</label>
                {catalogId && (
                  <button
                    type="button"
                    onClick={() => setIsManageCategoriesOpen(true)}
                    className="flex items-center gap-1 text-xs font-semibold text-accent hover:underline active:scale-95 transition-all"
                  >
                    <Settings size={12} />
                    <span>Gestionar</span>
                  </button>
                )}
              </div>

              {/* Trigger del Selector */}
              <div
                onClick={() => {
                  if (!isAnalyzing) {
                    setIsCategoryDropdownOpen(prev => !prev);
                  }
                }}
                className={`w-full h-[54px] bg-surface-hover/60 border rounded-2xl px-4 flex items-center justify-between cursor-pointer transition-all duration-200 ${
                  isCategoryDropdownOpen ? 'border-accent bg-surface shadow-sm ring-1 ring-accent/30' : 'border-border hover:bg-surface'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {selectedCategory ? (
                    <>
                      <div className="w-8 h-8 rounded-xl bg-surface border border-border flex items-center justify-center text-accent shrink-0 shadow-sm">
                        <CategoryIcon name={selectedCategory.icon} size={16} />
                      </div>
                      <span className="text-sm font-semibold text-primary truncate">
                        {selectedCategory.name}
                      </span>
                    </>
                  ) : (
                    <>
                      <div className="w-8 h-8 rounded-xl bg-surface/50 border border-border flex items-center justify-center text-secondary/60 shrink-0">
                        <Tag size={15} />
                      </div>
                      <span className="text-sm text-secondary truncate">
                        Sin categoría asignada
                      </span>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-2 text-secondary ml-2">
                  <ChevronDown
                    size={17}
                    className={`transition-transform duration-200 ${isCategoryDropdownOpen ? 'rotate-180 text-accent' : ''}`}
                  />
                </div>
              </div>

              {/* Menú Desplegable con Iconos */}
              {isCategoryDropdownOpen && (
                <div className="absolute left-0 right-0 top-full mt-1.5 z-40 bg-surface border border-border rounded-2xl shadow-2xl p-1.5 space-y-1 max-h-56 overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
                  {/* Opción Sin Categoría */}
                  <button
                    type="button"
                    onClick={() => {
                      setForm(prev => ({ ...prev, category_id: null }));
                      setIsCategoryDropdownOpen(false);
                    }}
                    className={`w-full px-3 py-2 rounded-xl flex items-center justify-between transition-colors text-left ${
                      form.category_id === null
                        ? 'bg-accent/15 text-accent font-bold'
                        : 'hover:bg-surface-hover text-secondary hover:text-primary'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-surface border border-border flex items-center justify-center text-secondary/60">
                        <Tag size={13} />
                      </div>
                      <span className="text-sm">Sin categoría</span>
                    </div>
                    {form.category_id === null && <Check size={16} className="text-accent" />}
                  </button>

                  {/* Lista de Categorías */}
                  {localCategories.map(cat => {
                    const isSelected = form.category_id === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          setForm(prev => ({ ...prev, category_id: cat.id }));
                          setIsCategoryDropdownOpen(false);
                        }}
                        className={`w-full px-3 py-2 rounded-xl flex items-center justify-between transition-colors text-left ${
                          isSelected
                            ? 'bg-accent/15 text-accent font-bold'
                            : 'hover:bg-surface-hover text-secondary hover:text-primary'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                          <div className="w-7 h-7 rounded-lg bg-surface border border-border flex items-center justify-center text-accent shrink-0">
                            <CategoryIcon name={cat.icon} size={14} />
                          </div>
                          <span className="text-sm truncate">{cat.name}</span>
                        </div>
                        {isSelected && <Check size={16} className="text-accent shrink-0" />}
                      </button>
                    );
                  })}

                  {/* Botón para Crear / Gestionar */}
                  {catalogId && (
                    <div className="pt-1 mt-1 border-t border-border">
                      <button
                        type="button"
                        onClick={() => {
                          setIsCategoryDropdownOpen(false);
                          setIsManageCategoriesOpen(true);
                        }}
                        className="w-full px-3 py-2 rounded-xl flex items-center gap-2 text-accent bg-accent/5 hover:bg-accent/15 font-bold text-xs transition-colors"
                      >
                        <Plus size={14} />
                        <span>Crear o editar categorías...</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Descripción */}
            <Input
              label="Descripción (Opcional)"
              placeholder="Ej: Salsa de tomate artesanal, queso mozzarella y albahaca fresca..."
              multiline
              rows={3}
              value={form.description}
              onChange={(e) => {
                const newDesc = e.target.value;
                setForm(prev => {
                  const updated = { ...prev, description: newDesc };
                  if (newDesc && (!prev.price || prev.price === '')) {
                    const parsed = parseProductText(newDesc);
                    if (parsed.bestPrice) {
                      updated.price = parsed.bestPrice.price.toString();
                      updated.currency = parsed.bestPrice.currency;
                    }
                    if (parsed.suggestedTitle && (!prev.name || prev.name === '')) {
                      updated.name = parsed.suggestedTitle;
                    }
                    setDetectedPrices(parsed.allPrices);
                  } else if (newDesc) {
                    const parsed = parseProductText(newDesc);
                    if (parsed.allPrices.length > 0) {
                      setDetectedPrices(parsed.allPrices);
                    }
                  }
                  return updated;
                });
              }}
              disabled={isAnalyzing}
            />

            {/* Estado del Producto (Activo/Inactivo) */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-surface-hover/50 border border-border">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-bold text-primary uppercase tracking-wider">Disponibilidad en Catálogo</span>
                <span className="text-[11px] text-secondary">
                  {form.is_active ? 'Visible para tus clientes en el catálogo público.' : 'Oculto: no aparecerá en el catálogo público.'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setForm(prev => ({ ...prev, is_active: !prev.is_active }))}
                className={`w-12 h-6 rounded-full transition-colors relative shrink-0 ${form.is_active ? 'bg-accent' : 'bg-secondary/40'}`}
                aria-label={form.is_active ? 'Desactivar producto' : 'Activar producto'}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-all ${form.is_active ? 'left-7' : 'left-1'}`} />
              </button>
            </div>
          </div>
        </form>
      </BottomSheet>

      <CalculatorModal
        isOpen={calculatorOpen}
        onClose={() => setCalculatorOpen(false)}
        onConfirm={(val) => setForm(prev => ({ ...prev, price: val.toString() }))}
        initialValue={parseFloat(form.price.toString()) || 0}
      />

      {catalogId && (
        <ManageCategoriesModal
          isOpen={isManageCategoriesOpen}
          onClose={() => setIsManageCategoriesOpen(false)}
          catalogId={catalogId}
          zIndex="z-[60]"
          onCategoriesChange={handleCategoriesChanged}
          onCategoryCreated={handleCategoryCreatedFromModal}
        />
      )}
    </>
  );
};
