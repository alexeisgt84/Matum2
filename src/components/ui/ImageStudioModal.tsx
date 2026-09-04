import React, { useState, useCallback, useEffect, useRef } from 'react';
import Cropper from 'react-easy-crop';
import { Modal } from './Modal';
import { Button } from './Button';
import { 
  processStudioImage, 
  getImageMetadata, 
  formatBytes, 
  type ImageMetaData 
} from '../../lib/imageOptimizer';
import { 
  Sliders, 
  RotateCw, 
  RotateCcw, 
  Check, 
  Sparkles, 
  Zap, 
  Maximize2,
  Crop as CropIcon,
  ShieldCheck
} from 'lucide-react';
import { toast } from 'react-hot-toast';

export interface ImageStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  image: string | null;
  onProcessComplete: (processedFile: File, metadata: ImageMetaData) => void;
  title?: string;
  defaultAspect?: number;
}

export const ImageStudioModal: React.FC<ImageStudioModalProps> = ({
  isOpen,
  onClose,
  image,
  onProcessComplete,
  title = 'Studio de Imágenes',
  defaultAspect = 1
}) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [aspect, setAspect] = useState<number | undefined>(defaultAspect);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  
  // Tamaño para modo Libre y redimensión
  const [freeCropSize, setFreeCropSize] = useState<{ width: number; height: number }>({ width: 260, height: 260 });
  const [containerDimensions, setContainerDimensions] = useState<{ width: number; height: number }>({ width: 350, height: 350 });
  const containerRef = useRef<HTMLDivElement>(null);
  const lastCropSizeRef = useRef<{ width: number; height: number }>({ width: 260, height: 260 });
  const [_isResizing, setIsResizing] = useState(false);
  
  // Opciones de formateo
  const [format, setFormat] = useState<'image/webp' | 'image/jpeg' | 'image/png'>('image/webp');
  const [quality, setQuality] = useState<number>(0.85);
  const [maxMegapixels, setMaxMegapixels] = useState<number>(2.0); // 2.0 MP por defecto para Supabase
  
  // Metadatos y estados
  const [origMetadata, setOrigMetadata] = useState<ImageMetaData | null>(null);
  const [estimatedMetadata, setEstimatedMetadata] = useState<ImageMetaData | null>(null);
  const [loading, setLoading] = useState(false);
  const [_estimating, setEstimating] = useState(false);

  // Observar dimensiones del contenedor del cropper
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setContainerDimensions({ width, height });
          // Inicializar freeCropSize si aún no se ha establecido
          setFreeCropSize((prev) => {
            if (prev.width === 260 && prev.height === 260) {
              const defaultSize = Math.round(Math.min(width, height) * 0.8);
              return { width: defaultSize, height: defaultSize };
            }
            return prev;
          });
        }
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Cargar metadatos originales al recibir la imagen
  useEffect(() => {
    if (!image) return;
    let isMounted = true;
    (async () => {
      try {
        const response = await fetch(image);
        const blob = await response.blob();
        const meta = await getImageMetadata(blob);
        if (isMounted) {
          setOrigMetadata(meta);
          // Si la imagen es muy grande (>2MP), notificar suavemente
          if (meta.megapixels > 2.0) {
            toast.custom(
              (t) => (
                <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md bg-zinc-900 border border-[var(--accent)]/40 p-4 rounded-xl shadow-2xl flex items-start gap-3 text-white z-[9999]`}>
                  <Zap className="text-[var(--accent)] shrink-0 mt-0.5" size={20} />
                  <div>
                    <p className="font-semibold text-xs text-[var(--accent)] uppercase tracking-wider">Imagen &gt; 2 Megapíxeles Detectada ({meta.megapixels} MP)</p>
                    <p className="text-xs text-gray-300 mt-1">
                      El Studio formateará automáticamente esta foto para un rendimiento ultra rápido en Supabase.
                    </p>
                  </div>
                </div>
              ),
              { duration: 4000 }
            );
          }
        }
      } catch (err) {
        console.warn('Error leyendo metadata inicial:', err);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [image]);

  const onCropAreaComplete = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleCropSizeChange = useCallback((size: { width: number; height: number }) => {
    lastCropSizeRef.current = size;
  }, []);

  const handleSelectAspect = (val: number | undefined) => {
    if (val === undefined && aspect !== undefined) {
      // Al cambiar a modo libre, inicializamos freeCropSize con el último tamaño calculado
      if (lastCropSizeRef.current.width > 0 && lastCropSizeRef.current.height > 0) {
        setFreeCropSize({
          width: Math.round(lastCropSizeRef.current.width),
          height: Math.round(lastCropSizeRef.current.height),
        });
      }
    }
    setAspect(val);
  };

  // Manejador de redimensión interactiva en modo libre
  const startResize = (
    e: React.PointerEvent,
    direction: 'tl' | 'tr' | 'bl' | 'br' | 't' | 'b' | 'l' | 'r'
  ) => {
    e.preventDefault();
    e.stopPropagation();

    if (!containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const centerX = containerRect.left + containerRect.width / 2;
    const centerY = containerRect.top + containerRect.height / 2;

    const maxW = Math.max(80, containerRect.width - 24);
    const maxH = Math.max(80, containerRect.height - 24);
    const minSize = 60;

    setIsResizing(true);

    const onPointerMove = (moveEvent: PointerEvent) => {
      moveEvent.preventDefault();
      const pointerX = moveEvent.clientX;
      const pointerY = moveEvent.clientY;

      setFreeCropSize((prev) => {
        let newW = prev.width;
        let newH = prev.height;

        // Horizontales
        if (direction === 'tl' || direction === 'bl' || direction === 'l') {
          const distFromCenter = Math.max(minSize / 2, centerX - pointerX);
          newW = Math.min(maxW, Math.round(distFromCenter * 2));
        } else if (direction === 'tr' || direction === 'br' || direction === 'r') {
          const distFromCenter = Math.max(minSize / 2, pointerX - centerX);
          newW = Math.min(maxW, Math.round(distFromCenter * 2));
        }

        // Verticales
        if (direction === 'tl' || direction === 'tr' || direction === 't') {
          const distFromCenter = Math.max(minSize / 2, centerY - pointerY);
          newH = Math.min(maxH, Math.round(distFromCenter * 2));
        } else if (direction === 'bl' || direction === 'br' || direction === 'b') {
          const distFromCenter = Math.max(minSize / 2, pointerY - centerY);
          newH = Math.min(maxH, Math.round(distFromCenter * 2));
        }

        return { width: newW, height: newH };
      });
    };

    const onPointerUp = () => {
      setIsResizing(false);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove, { passive: false });
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
  };

  // Actualizar estimación de peso y resolución en vivo cuando cambian las opciones
  useEffect(() => {
    if (!image || !croppedAreaPixels) return;
    let active = true;
    const updateEstimate = async () => {
      setEstimating(true);
      try {
        const { metadata } = await processStudioImage(image, {
          pixelCrop: croppedAreaPixels,
          rotation,
          format,
          quality,
          maxMegapixels: maxMegapixels > 0 ? maxMegapixels : undefined
        });
        if (active) {
          setEstimatedMetadata(metadata);
        }
      } catch (err) {
        console.warn('Error calculando estimación:', err);
      } finally {
        if (active) setEstimating(false);
      }
    };

    const timer = setTimeout(updateEstimate, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [image, croppedAreaPixels, rotation, format, quality, maxMegapixels]);

  const handleRotateLeft = () => setRotation((prev) => (prev - 90 + 360) % 360);
  const handleRotateRight = () => setRotation((prev) => (prev + 90) % 360);

  const handleConfirmProcess = async () => {
    if (!image || !croppedAreaPixels) return;
    setLoading(true);

    try {
      const { blob, metadata } = await processStudioImage(image, {
        pixelCrop: croppedAreaPixels,
        rotation,
        format,
        quality,
        maxMegapixels: maxMegapixels > 0 ? maxMegapixels : undefined
      });

      let ext = 'webp';
      if (format === 'image/jpeg') ext = 'jpg';
      if (format === 'image/png') ext = 'png';

      const fileName = `studio_${Date.now()}.${ext}`;
      const processedFile = new File([blob], fileName, { type: blob.type });

      toast.success(
        `Imagen optimizada: ${metadata.megapixels} MP (${formatBytes(metadata.sizeBytes)})`,
        { icon: '✨' }
      );

      onProcessComplete(processedFile, metadata);
      onClose();
    } catch (err: any) {
      console.error('Error procesando en Studio:', err);
      toast.error('Error al procesar la imagen: ' + (err.message || 'Error desconocido'));
    } finally {
      setLoading(false);
    }
  };

  if (!image) return null;

  // Cálculo de reducción porcentual de tamaño
  const savingsPercent = origMetadata && estimatedMetadata 
    ? Math.max(0, Math.round(((origMetadata.sizeBytes - estimatedMetadata.sizeBytes) / origMetadata.sizeBytes) * 100))
    : 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <Sparkles className="text-[var(--accent)]" size={20} />
          <span>{title}</span>
          {origMetadata && origMetadata.megapixels > 2.0 && (
            <span className="ml-2 text-[10px] bg-[var(--accent)]/15 text-[var(--accent)] border border-[var(--accent)]/30 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
              {origMetadata.megapixels} MP
            </span>
          )}
        </div>
      }
      footer={
        <div className="flex gap-3 w-full">
          <Button 
            variant="secondary" 
            className="flex-1" 
            onClick={onClose}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button 
            variant="primary" 
            className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-medium border-0" 
            onClick={handleConfirmProcess}
            loading={loading}
            icon={Check}
          >
            Formatear y Guardar
          </Button>
        </div>
      }
    >
      <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
        {/* Banner informativo de Supabase Storage */}
        <div className="bg-zinc-900/90 border border-white/10 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-emerald-400 shrink-0" />
            <div>
              <span className="text-gray-300 font-medium">Original: </span>
              <span className="text-gray-400 font-mono">
                {origMetadata ? `${origMetadata.width}x${origMetadata.height} (${origMetadata.megapixels} MP) • ${formatBytes(origMetadata.sizeBytes)}` : 'Cargando...'}
              </span>
            </div>
          </div>
          {estimatedMetadata && (
            <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg">
              <Zap size={14} className="text-emerald-400 shrink-0" />
              <span className="text-emerald-300 font-medium font-mono text-[11px]">
                Supabase Target: ~{formatBytes(estimatedMetadata.sizeBytes)} ({estimatedMetadata.megapixels} MP)
                {savingsPercent > 0 && <span className="ml-1 text-emerald-400 font-bold">(-{savingsPercent}%)</span>}
              </span>
            </div>
          )}
        </div>

        {/* Viewport del Cropper */}
        <div 
          ref={containerRef}
          className="relative w-full aspect-square bg-zinc-950 rounded-2xl overflow-hidden border border-white/10 shadow-inner group select-none"
        >
          <Cropper
            image={image}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={aspect ?? (freeCropSize.width / freeCropSize.height)}
            cropSize={aspect === undefined ? freeCropSize : undefined}
            onCropChange={setCrop}
            onCropComplete={onCropAreaComplete}
            onCropSizeChange={handleCropSizeChange}
            onZoomChange={setZoom}
            objectFit="contain"
          />

          {/* Manejadores de Redimensión en Modo Libre */}
          {aspect === undefined && (
            <div
              style={{
                width: freeCropSize.width,
                height: freeCropSize.height,
              }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-20"
            >
              {/* Borde activo destacado */}
              <div className="absolute inset-0 border-2 border-[var(--accent)] pointer-events-none rounded-sm" />

              {/* Badge con dimensiones en tiempo real */}
              <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-black/85 backdrop-blur-md px-2 py-0.5 rounded-md text-[10px] font-mono font-bold text-[var(--accent)] border border-[var(--accent)]/40 pointer-events-none whitespace-nowrap shadow-lg">
                {Math.round(freeCropSize.width)} × {Math.round(freeCropSize.height)} px
              </div>

              {/* Esquinas interactivas */}
              {/* Superior Izquierda */}
              <div
                onPointerDown={(e) => startResize(e, 'tl')}
                className="absolute -top-3 -left-3 w-6 h-6 rounded-full bg-[var(--accent)] border-2 border-white shadow-xl cursor-nwse-resize pointer-events-auto touch-none active:scale-125 transition-transform flex items-center justify-center"
                title="Redimensionar esquina superior izquierda"
              >
                <div className="w-1.5 h-1.5 bg-white rounded-full" />
              </div>

              {/* Superior Derecha */}
              <div
                onPointerDown={(e) => startResize(e, 'tr')}
                className="absolute -top-3 -right-3 w-6 h-6 rounded-full bg-[var(--accent)] border-2 border-white shadow-xl cursor-nesw-resize pointer-events-auto touch-none active:scale-125 transition-transform flex items-center justify-center"
                title="Redimensionar esquina superior derecha"
              >
                <div className="w-1.5 h-1.5 bg-white rounded-full" />
              </div>

              {/* Inferior Izquierda */}
              <div
                onPointerDown={(e) => startResize(e, 'bl')}
                className="absolute -bottom-3 -left-3 w-6 h-6 rounded-full bg-[var(--accent)] border-2 border-white shadow-xl cursor-nesw-resize pointer-events-auto touch-none active:scale-125 transition-transform flex items-center justify-center"
                title="Redimensionar esquina inferior izquierda"
              >
                <div className="w-1.5 h-1.5 bg-white rounded-full" />
              </div>

              {/* Inferior Derecha */}
              <div
                onPointerDown={(e) => startResize(e, 'br')}
                className="absolute -bottom-3 -right-3 w-6 h-6 rounded-full bg-[var(--accent)] border-2 border-white shadow-xl cursor-nwse-resize pointer-events-auto touch-none active:scale-125 transition-transform flex items-center justify-center"
                title="Redimensionar esquina inferior derecha"
              >
                <div className="w-1.5 h-1.5 bg-white rounded-full" />
              </div>

              {/* Bordes interactivos */}
              {/* Superior */}
              <div
                onPointerDown={(e) => startResize(e, 't')}
                className="absolute -top-2 left-1/2 -translate-x-1/2 w-14 h-4 cursor-ns-resize pointer-events-auto touch-none flex items-center justify-center"
                title="Redimensionar alto (arriba)"
              >
                <div className="w-8 h-1 bg-white/90 rounded-full shadow border border-black/30" />
              </div>

              {/* Inferior */}
              <div
                onPointerDown={(e) => startResize(e, 'b')}
                className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-14 h-4 cursor-ns-resize pointer-events-auto touch-none flex items-center justify-center"
                title="Redimensionar alto (abajo)"
              >
                <div className="w-8 h-1 bg-white/90 rounded-full shadow border border-black/30" />
              </div>

              {/* Izquierdo */}
              <div
                onPointerDown={(e) => startResize(e, 'l')}
                className="absolute top-1/2 -translate-y-1/2 -left-2 w-4 h-14 cursor-ew-resize pointer-events-auto touch-none flex items-center justify-center"
                title="Redimensionar ancho (izquierda)"
              >
                <div className="w-1 h-8 bg-white/90 rounded-full shadow border border-black/30" />
              </div>

              {/* Derecho */}
              <div
                onPointerDown={(e) => startResize(e, 'r')}
                className="absolute top-1/2 -translate-y-1/2 -right-2 w-4 h-14 cursor-ew-resize pointer-events-auto touch-none flex items-center justify-center"
                title="Redimensionar ancho (derecha)"
              >
                <div className="w-1 h-8 bg-white/90 rounded-full shadow border border-black/30" />
              </div>
            </div>
          )}
          
          {/* Botones Flotantes de Rotación */}
          <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-black/60 backdrop-blur-md border border-white/10 rounded-xl p-1 shadow-lg z-10">
            <button
              type="button"
              onClick={handleRotateLeft}
              title="Rotar 90° a la izquierda"
              className="p-1.5 hover:bg-white/10 text-gray-300 hover:text-white rounded-lg transition-colors"
            >
              <RotateCcw size={16} />
            </button>
            <button
              type="button"
              onClick={handleRotateRight}
              title="Rotar 90° a la derecha"
              className="p-1.5 hover:bg-white/10 text-gray-300 hover:text-white rounded-lg transition-colors"
            >
              <RotateCw size={16} />
            </button>
          </div>
        </div>

        {/* Controles de Zoom & Aspect Ratio */}
        <div className="bg-zinc-900/60 border border-white/5 rounded-xl p-3 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-gray-400 font-medium">
            <span className="flex items-center gap-1.5">
              <CropIcon size={14} className="text-[var(--accent)]" /> Disposición:
            </span>
            <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
              {[
                { label: '1:1', val: 1 },
                { label: '3:4', val: 3 / 4 },
                { label: '4:3', val: 4 / 3 },
                { label: '9:16', val: 9 / 16 },
                { label: '16:9', val: 16 / 9 },
                { label: 'Libre', val: undefined },
              ].map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => handleSelectAspect(item.val)}
                  className={`px-2 py-1 text-[11px] rounded-md transition-all font-medium shrink-0 ${
                    aspect === item.val
                      ? 'bg-[var(--accent)] text-white shadow'
                      : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Controles de Redimensión Manual cuando está en modo Libre */}
          {aspect === undefined && (
            <div className="pt-2 border-t border-white/5 space-y-2.5">
              <div className="flex items-center justify-between text-[11px] text-gray-300">
                <span className="text-[var(--accent)] font-semibold flex items-center gap-1">
                  ↔ ↕ Redimensión Libre:
                </span>
                <span className="font-mono text-gray-400">
                  {Math.round(freeCropSize.width)} × {Math.round(freeCropSize.height)} px
                </span>
              </div>

              {/* Sliders de Ancho y Alto */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-gray-400">
                    <span>Ancho:</span>
                    <span className="font-mono text-white">{Math.round(freeCropSize.width)}px</span>
                  </div>
                  <input
                    type="range"
                    value={freeCropSize.width}
                    min={60}
                    max={Math.max(80, containerDimensions.width - 24)}
                    step={2}
                    onChange={(e) => setFreeCropSize((prev) => ({ ...prev, width: Number(e.target.value) }))}
                    className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[var(--accent)]"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-gray-400">
                    <span>Alto:</span>
                    <span className="font-mono text-white">{Math.round(freeCropSize.height)}px</span>
                  </div>
                  <input
                    type="range"
                    value={freeCropSize.height}
                    min={60}
                    max={Math.max(80, containerDimensions.height - 24)}
                    step={2}
                    onChange={(e) => setFreeCropSize((prev) => ({ ...prev, height: Number(e.target.value) }))}
                    className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[var(--accent)]"
                  />
                </div>
              </div>

              <p className="text-[10px] text-gray-400 italic">
                * Consejo: Puedes arrastrar directamente las esquinas o bordes del recuadro sobre la imagen.
              </p>
            </div>
          )}

          <div className="flex items-center gap-3 pt-1">
            <Maximize2 size={14} className="text-gray-400 shrink-0" />
            <input
              type="range"
              value={zoom}
              min={1}
              max={3}
              step={0.05}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[var(--accent)]"
            />
            <span className="text-[11px] font-mono text-gray-400 w-8 text-right">{zoom.toFixed(1)}x</span>
          </div>
        </div>

        {/* Opciones de Formateo y Megapíxeles para Supabase */}
        <div className="bg-zinc-900/80 border border-white/10 rounded-xl p-3.5 space-y-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-200">
            <Sliders size={15} className="text-[var(--accent)]" />
            <span>Configuración de Formateo & Optimización</span>
          </div>

          {/* Formato de Imagen */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-gray-400 flex items-center justify-between">
              <span>Formato de salida:</span>
              <span className="text-[10px] text-emerald-400 font-normal">*WebP es ultraligero para Supabase</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'image/webp', label: 'WebP (Top)', desc: 'Ultraligero' },
                { id: 'image/jpeg', label: 'JPEG', desc: 'Compatibilidad' },
                { id: 'image/png', label: 'PNG', desc: 'Sin pérdida' },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFormat(f.id as any)}
                  className={`p-2 rounded-xl text-left border transition-all ${
                    format === f.id
                      ? 'border-[var(--accent)] bg-[var(--accent)]/15 text-white shadow-md'
                      : 'border-white/5 bg-white/5 text-gray-400 hover:border-white/20'
                  }`}
                >
                  <p className="text-xs font-bold">{f.label}</p>
                  <p className="text-[10px] opacity-75">{f.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Máximo Megapíxeles */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-gray-400 flex items-center justify-between">
              <span>Límite de Megapíxeles:</span>
              <span className="text-[10px] text-gray-400">Reduce fotos de 12MP/48MP</span>
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { mp: 1.0, label: '1.0 MP', note: 'Rápido' },
                { mp: 2.0, label: '2.0 MP', note: 'Óptimo' },
                { mp: 4.0, label: '4.0 MP', note: 'Alta Res' },
                { mp: 0, label: 'Max Orig', note: 'Sin Límite' },
              ].map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => setMaxMegapixels(item.mp)}
                  className={`p-2 rounded-xl border text-center transition-all ${
                    maxMegapixels === item.mp
                      ? 'border-emerald-500 bg-emerald-500/15 text-emerald-300 font-bold'
                      : 'border-white/5 bg-white/5 text-gray-400 hover:border-white/20'
                  }`}
                >
                  <p className="text-xs">{item.label}</p>
                  <p className="text-[9px] opacity-75">{item.note}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Calidad de Compresión */}
          {format !== 'image/png' && (
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-xs text-gray-300">
                <span className="font-medium">Calidad de compresión:</span>
                <span className="font-mono text-emerald-400 font-bold">{Math.round(quality * 100)}%</span>
              </div>
              <input
                type="range"
                value={quality}
                min={0.4}
                max={1.0}
                step={0.05}
                onChange={(e) => setQuality(Number(e.target.value))}
                className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
