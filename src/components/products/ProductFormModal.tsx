import React, { useState, useEffect, useRef } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import type { Product, ProductForm } from '../../types/product';
import type { Category } from '../../types/category';
import { Camera, Save, Tag, Send, Sparkles, Crown, Calculator, Link2Off, Plus, Check, ChevronDown, Settings } from 'lucide-react';
import { CalculatorModal } from '../ui/CalculatorModal';
import { Camera as CapCamera, CameraResultType, CameraSource } from '@capacitor/camera';
import { ImageCropperModal } from '../ui/ImageCropperModal';
import { blobToFile, preScaleImage } from '../../lib/imageOptimizer';
import heic2any from 'heic2any';
import { toast } from 'react-hot-toast';
import { useProfile } from '../../hooks/useProfile';
import { analyzeProductImage } from '../../lib/aiService';
import { supabase } from '../../lib/supabase';
import { CategoryIcon } from '../ui/CategoryIcon';
import { ManageCategoriesModal } from './ManageCategoriesModal';

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
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const [calculatorOpen, setCalculatorOpen] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [parentProductId, setParentProductId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      setPreview(product.imagen_url);
      setParentProductId(product.parent_product_id || null);
    } else if (prefilledData) {
      setForm({
        name: '',
        description: prefilledData.description || '',
        price: '',
        currency: 'USD',
        imagen_url: null,
        category_id: null,
        is_active: true,
      });
      setPreview(prefilledData.preview || null);
      setFile(prefilledData.file);
      setParentProductId(null);
    } else {
      setForm({ name: '', description: '', price: '', currency: 'USD', imagen_url: null, category_id: null, is_active: true });
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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      await processAndOpenCropper(selectedFile);
      // Reset input so the same file can be selected again if needed
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const processAndOpenCropper = async (file: File | Blob) => {
    let fileToProcess = file;
    const fileName = (file as File).name || 'image.jpg';
    const extension = fileName.split('.').pop()?.toLowerCase();

    // Soporte HEIC
    if (file.type === 'image/heic' || file.type === 'image/heif' || extension === 'heic' || extension === 'heif') {
      setIsConverting(true);
      const toastId = toast.loading('Convirtiendo formato de iPhone...');
      try {
        const converted = await heic2any({
          blob: file,
          toType: 'image/jpeg',
          quality: 0.8
        });
        fileToProcess = Array.isArray(converted) ? converted[0] : converted;
        toast.success('Imagen convertida', { id: toastId });
      } catch (err) {
        console.error('Error al convertir HEIC:', err);
        toast.error('No se pudo convertir el formato HEIC', { id: toastId });
      } finally {
        setIsConverting(false);
      }
    }

    // Pre-escalar si es muy pesada (>800KB / resolución gigante) antes de pasar al recortador
    try {
      fileToProcess = await preScaleImage(fileToProcess, 1200);
    } catch (scaleErr) {
      console.warn('Pre-escalado omitido:', scaleErr);
    }

    const url = URL.createObjectURL(fileToProcess);
    setSelectedImage(url);
    setIsCropperOpen(true);
  };

  const handleSelectImage = async () => {
    try {
      const image = await CapCamera.getPhoto({
        quality: 90,
        allowEditing: false, 
        resultType: CameraResultType.Uri,
        source: CameraSource.Prompt, 
        promptLabelHeader: 'Añadir Foto',
        promptLabelPhoto: 'Elegir de la Galería',
        promptLabelPicture: 'Tomar Foto',
        promptLabelCancel: 'Cancelar'
      });

      if (image.webPath) {
        // En Capacitor, el webPath suele ser ya un formato compatible, 
        // pero por si acaso lo pasamos por el procesador
        const response = await fetch(image.webPath);
        const blob = await response.blob();
        await processAndOpenCropper(blob);
      }
    } catch (err) {
      // Fallback to traditional file input if Camera fails (common on some browsers/PC)
      console.log('Capacitor Camera error, falling back to file input', err);
      fileInputRef.current?.click();
    }
  };

  const handleCropComplete = (croppedBlob: Blob) => {
    if (preview && preview.startsWith('blob:')) {
      URL.revokeObjectURL(preview);
    }
    const croppedFile = blobToFile(croppedBlob, `product_${Date.now()}.jpg`);
    setFile(croppedFile);
    const url = URL.createObjectURL(croppedBlob);
    setPreview(url);
    setIsCropperOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent, shouldSend = false) => {
    e?.preventDefault();
    const success = await onSave(form, product?.id, file, shouldSend);
    if (success) onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={product ? 'Editar Producto' : 'Nuevo Producto'}
      footer={
        <div className="flex gap-3 w-full">
          <Button 
            variant="secondary"
            className="flex-1" 
            loading={loading}
            icon={Save}
            onClick={(e) => handleSubmit(e as any, false)}
          >
             {product ? 'Aceptar' : 'Aceptar'}
          </Button>
          {!product && (
            <Button 
              className="flex-1" 
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
      <form id="product-form" onSubmit={handleSubmit} className="space-y-6">
        <div className="flex flex-col items-center mb-4">
          <div 
            className="w-32 h-32 rounded-2xl bg-surface-hover border-2 border-dashed border-border flex items-center justify-center relative overflow-hidden group hover:border-[var(--accent)]/50 transition-colors cursor-pointer"
            onClick={handleSelectImage}
          >
            {preview ? (
              <img src={preview} alt="Preview" className="w-full h-full object-cover" />
            ) : (
              <div className="flex flex-col items-center gap-2 text-gray-500 group-hover:text-[var(--accent)]">
                {isConverting ? (
                  <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Camera size={32} />
                )}
                <span className="text-[10px] font-bold uppercase tracking-widest">
                  {isConverting ? 'Convirtiendo...' : 'Añadir Foto'}
                </span>
              </div>
            )}
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/jpeg,image/jpg,image/png,image/heic,image/heif,image/*"
              onChange={handleFileChange}
              disabled={isConverting || isAnalyzing}
            />
          </div>
          
          {/* Banner de invitación o botón de IA y Studio */}
          {preview && (
            <div className="mt-3 flex flex-wrap gap-2 items-center">
              <button
                type="button"
                onClick={() => {
                  if (selectedImage) {
                    setIsCropperOpen(true);
                  } else if (preview) {
                    setSelectedImage(preview);
                    setIsCropperOpen(true);
                  }
                }}
                className="flex items-center gap-1.5 py-2 px-3.5 rounded-xl text-xs font-bold bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 text-emerald-400 active:scale-95 transition-all"
                title="Editar, recortar y optimizar formato/megapíxeles"
              >
                <Sparkles size={13} className="text-emerald-400" />
                <span>Studio de Imagen 🎨</span>
              </button>

              {profile?.gemini_api_key && (
                isPremium ? (
                  <button
                    type="button"
                    onClick={handleAIClick}
                    disabled={isAnalyzing}
                    className="flex items-center gap-1.5 py-2 px-4 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white shadow-md shadow-purple-500/10 active:scale-95 transition-all"
                  >
                    <Sparkles size={13} className="text-purple-200 animate-pulse" />
                    <span>Autocompletar con IA ✨</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleAIClick}
                    className="flex items-center gap-1.5 py-2 px-4 rounded-xl text-xs font-bold bg-surface-hover border border-border hover:bg-surface text-secondary transition-all"
                  >
                    <Crown size={13} className="text-amber-400" />
                    <span>Autocompletar con IA (Premium 👑)</span>
                  </button>
                )
              )}
            </div>
          )}

          {!preview && profile?.gemini_api_key && (
            <div className="mt-3 py-1.5 px-4 rounded-full bg-emerald-500/5 border border-emerald-500/10 text-[10px] text-emerald-400 font-medium flex items-center gap-1.5 justify-center">
              <Sparkles size={12} className="text-emerald-400 animate-pulse" />
              <span>Añade una foto para habilitar la IA ✨</span>
            </div>
          )}
        </div>

        <div className="relative space-y-4 p-1">
          {/* Overlay de Carga Premium de la IA */}
          {isAnalyzing && (
            <div className="absolute inset-0 bg-black/70 backdrop-blur-[6px] z-20 rounded-2xl flex flex-col items-center justify-center border border-purple-500/20 shadow-2xl p-6">
              <div className="p-3.5 bg-gradient-to-br from-purple-500/20 to-indigo-500/20 text-purple-400 rounded-2xl border border-purple-500/30 mb-3 shadow-lg shadow-purple-500/10 animate-bounce">
                <Sparkles size={26} className="animate-pulse" />
              </div>
              <span className="text-xs font-bold text-white uppercase tracking-widest bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
                La IA está leyendo tu imagen...
              </span>
              <span className="text-[10px] text-gray-400 mt-1.5 tracking-wide text-center max-w-[280px]">
                Analizando los detalles de tu producto para autocompletar el título y descripción sugeridos
              </span>
            </div>
          )}

          {/* Alerta de Producto Vinculado */}
          {parentProductId && (
            <div className="p-3.5 rounded-2xl bg-blue-500/5 border border-blue-500/20 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between animate-in fade-in duration-300">
              <div className="flex-1">
                <span className="text-[10px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full font-black uppercase tracking-wider">
                  Importado
                </span>
                <p className="text-secondary text-[11px] mt-1.5 leading-relaxed font-semibold">
                  Este producto está vinculado a un catálogo de origen. Las actualizaciones del catálogo de origen se sincronizan automáticamente.
                </p>
              </div>
              {onUnlink && (
                <button
                  type="button"
                  onClick={handleUnlink}
                  className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-orange-400 hover:text-orange-500 bg-orange-500/5 hover:bg-orange-500/10 px-3 py-1.5 rounded-xl border border-orange-500/10 transition-colors flex-shrink-0 shadow-sm"
                >
                  <Link2Off size={12} />
                  <span>Desvincular</span>
                </button>
              )}
            </div>
          )}

          <Input
            label="Nombre del Producto"
            placeholder="Ej: Pizza Margherita"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            autoFocus
            disabled={isAnalyzing}
          />

          <div className="grid grid-cols-3 gap-4">
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
                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-surface hover:bg-surface-hover border border-border text-secondary hover:text-primary transition-colors active:scale-95 shadow-sm"
                    title="Abrir calculadora"
                  >
                    <Calculator size={18} />
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

          {/* Selector de Categoría con Icono */}
          <div className="space-y-2 relative" ref={categoryDropdownRef}>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-secondary ml-1">Categoría (Opcional)</label>
              {catalogId && (
                <button
                  type="button"
                  onClick={() => setIsManageCategoriesOpen(true)}
                  className="flex items-center gap-1.5 text-xs font-bold text-accent hover:underline active:scale-95 transition-all"
                >
                  <Settings size={13} />
                  <span>Gestionar categorías</span>
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
              className={`w-full h-[58px] bg-surface-hover border rounded-xl px-4 flex items-center justify-between cursor-pointer transition-all duration-200 ${
                isCategoryDropdownOpen ? 'border-accent bg-surface shadow-sm' : 'border-border hover:bg-surface'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {selectedCategory ? (
                  <>
                    <div className="w-8 h-8 rounded-lg bg-surface border border-border flex items-center justify-center text-accent flex-shrink-0 shadow-sm">
                      <CategoryIcon name={selectedCategory.icon} size={16} />
                    </div>
                    <span className="text-sm font-medium text-primary truncate">
                      {selectedCategory.name}
                    </span>
                  </>
                ) : (
                  <>
                    <div className="w-8 h-8 rounded-lg bg-surface/50 border border-border/50 flex items-center justify-center text-secondary/50 flex-shrink-0">
                      <Tag size={16} />
                    </div>
                    <span className="text-sm text-secondary truncate">
                      Sin categoría
                    </span>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2 text-secondary ml-2">
                <ChevronDown
                  size={18}
                  className={`transition-transform duration-200 ${isCategoryDropdownOpen ? 'rotate-180 text-accent' : ''}`}
                />
              </div>
            </div>

            {/* Menú Desplegable con Iconos y Opción de Crear / Editar en Modal */}
            {isCategoryDropdownOpen && (
              <div className="absolute left-0 right-0 top-full mt-1.5 z-40 bg-surface border border-border rounded-2xl shadow-2xl p-1.5 space-y-1 max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
                {/* Opción Sin Categoría */}
                <button
                  type="button"
                  onClick={() => {
                    setForm(prev => ({ ...prev, category_id: null }));
                    setIsCategoryDropdownOpen(false);
                  }}
                  className={`w-full px-3 py-2.5 rounded-xl flex items-center justify-between transition-colors text-left ${
                    form.category_id === null
                      ? 'bg-accent/10 text-accent font-bold'
                      : 'hover:bg-surface-hover text-secondary hover:text-primary'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-surface border border-border flex items-center justify-center text-secondary/60">
                      <Tag size={14} />
                    </div>
                    <span className="text-sm">Sin categoría</span>
                  </div>
                  {form.category_id === null && <Check size={16} className="text-accent" />}
                </button>

                {/* Lista de Categorías con sus Iconos */}
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
                      className={`w-full px-3 py-2.5 rounded-xl flex items-center justify-between transition-colors text-left ${
                        isSelected
                          ? 'bg-accent/10 text-accent font-bold'
                          : 'hover:bg-surface-hover text-secondary hover:text-primary'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                        <div className="w-7 h-7 rounded-lg bg-surface border border-border flex items-center justify-center text-accent flex-shrink-0">
                          <CategoryIcon name={cat.icon} size={15} />
                        </div>
                        <span className="text-sm truncate">{cat.name}</span>
                      </div>
                      {isSelected && <Check size={16} className="text-accent flex-shrink-0" />}
                    </button>
                  );
                })}

                {/* Botón para Abrir Modal de Creación / Edición */}
                {catalogId && (
                  <div className="pt-1 mt-1 border-t border-border">
                    <button
                      type="button"
                      onClick={() => {
                        setIsCategoryDropdownOpen(false);
                        setIsManageCategoriesOpen(true);
                      }}
                      className="w-full px-3 py-2.5 rounded-xl flex items-center gap-2 text-accent bg-accent/5 hover:bg-accent/15 font-bold text-xs transition-colors"
                    >
                      <Plus size={15} />
                      <span>Crear o editar categorías...</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <Input
            label="Descripción (Opcional)"
            placeholder="Ej: Salsa de tomate, mozzarella y albahaca fresca"
            multiline
            rows={3}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            disabled={isAnalyzing}
          />

          {/* Activar / Desactivar Producto */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-surface-hover border border-border/60">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-bold text-primary uppercase tracking-wider">Estado del Producto</span>
              <span className="text-[10px] text-secondary">
                {form.is_active ? 'El producto está visible en el catálogo público.' : 'El producto está oculto y no será visible para los clientes.'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setForm(prev => ({ ...prev, is_active: !prev.is_active }))}
              className={`w-12 h-6 rounded-full transition-colors relative flex-shrink-0 ${form.is_active ? 'bg-accent' : 'bg-secondary'}`}
              aria-label={form.is_active ? 'Desactivar producto' : 'Activar producto'}
            >
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-black transition-all ${form.is_active ? 'left-7' : 'left-1'}`} />
            </button>
          </div>
        </div>
      </form>

      <ImageCropperModal
        isOpen={isCropperOpen}
        onClose={() => setIsCropperOpen(false)}
        image={selectedImage}
        onCropComplete={handleCropComplete}
      />

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
    </Modal>
  );
};
