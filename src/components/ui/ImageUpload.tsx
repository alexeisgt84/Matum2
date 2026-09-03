import React, { useState, useRef, useEffect } from 'react';
import { Camera as CapCamera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Camera, Sparkles, X } from 'lucide-react';
import heic2any from 'heic2any';
import { toast } from 'react-hot-toast';
import { blobToFile, preScaleImage } from '../../lib/imageOptimizer';
import { ImageCropperModal } from './ImageCropperModal';

export interface ImageUploadProps {
  value?: string | null;
  onChange: (file: File, previewUrl: string) => void;
  onRemove?: () => void;
  disabled?: boolean;
  label?: string;
  title?: string;
  defaultAspect?: number;
  filePrefix?: string;
  className?: string;
  extraActions?: React.ReactNode;
  bottomContent?: React.ReactNode;
  hideStudioButton?: boolean;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
  value,
  onChange,
  onRemove,
  disabled = false,
  label = 'Añadir Foto',
  title = 'Studio de Imágenes',
  defaultAspect = 1,
  filePrefix = 'image',
  className = '',
  extraActions,
  bottomContent,
  hideStudioButton = false,
}) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (selectedImage && selectedImage.startsWith('blob:')) {
        URL.revokeObjectURL(selectedImage);
      }
    };
  }, [selectedImage]);

  const processAndOpenCropper = async (file: File | Blob) => {
    let fileToProcess = file;
    const fileName = (file as File).name || 'image.jpg';
    const extension = fileName.split('.').pop()?.toLowerCase();

    // Soporte para formato HEIC / HEIF (iPhone)
    if (
      file.type === 'image/heic' ||
      file.type === 'image/heif' ||
      extension === 'heic' ||
      extension === 'heif'
    ) {
      setIsConverting(true);
      const toastId = toast.loading('Convirtiendo formato de iPhone...');
      try {
        const converted = await heic2any({
          blob: file,
          toType: 'image/jpeg',
          quality: 0.8,
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

    // Pre-escalar si la imagen es gigante antes de pasar al recortador/studio
    try {
      fileToProcess = await preScaleImage(fileToProcess, 1200);
    } catch (scaleErr) {
      console.warn('Pre-escalado omitido:', scaleErr);
    }

    if (selectedImage && selectedImage.startsWith('blob:')) {
      URL.revokeObjectURL(selectedImage);
    }

    const url = URL.createObjectURL(fileToProcess);
    setSelectedImage(url);
    setIsCropperOpen(true);
  };

  const handleSelectImage = async () => {
    if (disabled || isConverting) return;
    try {
      const image = await CapCamera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Prompt,
        promptLabelHeader: label,
        promptLabelPhoto: 'Elegir de la Galería',
        promptLabelPicture: 'Tomar Foto',
        promptLabelCancel: 'Cancelar',
      });

      if (image.webPath) {
        const response = await fetch(image.webPath);
        const blob = await response.blob();
        await processAndOpenCropper(blob);
      }
    } catch (err) {
      // Fallback para navegadores o plataformas donde no esté disponible la cámara nativa
      console.log('Capacitor Camera no disponible o cancelado, usando selector de archivos', err);
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      await processAndOpenCropper(selectedFile);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleCropComplete = (croppedBlob: Blob) => {
    const croppedFile = blobToFile(croppedBlob, `${filePrefix}_${Date.now()}.jpg`);
    const newPreview = URL.createObjectURL(croppedBlob);
    onChange(croppedFile, newPreview);
    setIsCropperOpen(false);
  };

  const openStudio = () => {
    if (selectedImage) {
      setIsCropperOpen(true);
    } else if (value) {
      setSelectedImage(value);
      setIsCropperOpen(true);
    }
  };

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div className="relative group">
        <div
          className={`w-32 h-32 rounded-2xl bg-surface-hover border-2 border-dashed border-border flex items-center justify-center relative overflow-hidden transition-colors ${
            disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-[var(--accent)]/50'
          }`}
          onClick={handleSelectImage}
        >
          {value ? (
            <img src={value} alt="Preview" className="w-full h-full object-cover" />
          ) : (
            <div className="flex flex-col items-center gap-2 text-gray-500 group-hover:text-[var(--accent)]">
              {isConverting ? (
                <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
              ) : (
                <Camera size={32} />
              )}
              <span className="text-[10px] font-bold uppercase tracking-widest text-center px-1">
                {isConverting ? 'Convirtiendo...' : label}
              </span>
            </div>
          )}
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/jpeg,image/jpg,image/png,image/heic,image/heif,image/*"
            onChange={handleFileChange}
            disabled={disabled || isConverting}
          />
        </div>

        {value && onRemove && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="absolute -top-2 -right-2 p-1.5 bg-black/80 hover:bg-red-500 rounded-full text-white shadow-lg transition-all active:scale-90 z-10"
            title="Quitar foto"
            disabled={disabled}
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Botones de acción / Studio / Extras */}
      {value && (
        <div className="mt-3 flex flex-wrap gap-2 items-center justify-center">
          {!hideStudioButton && (
            <button
              type="button"
              onClick={openStudio}
              disabled={disabled}
              className="flex items-center gap-1.5 py-2 px-3.5 rounded-xl text-xs font-bold bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 text-emerald-400 active:scale-95 transition-all"
              title="Editar, recortar y optimizar formato/megapíxeles"
            >
              <Sparkles size={13} className="text-emerald-400" />
              <span>Studio de Imagen 🎨</span>
            </button>
          )}

          {extraActions}
        </div>
      )}

      {!value && extraActions && (
        <div className="mt-3 flex flex-wrap gap-2 items-center justify-center">
          {extraActions}
        </div>
      )}

      {bottomContent}

      <ImageCropperModal
        isOpen={isCropperOpen}
        onClose={() => setIsCropperOpen(false)}
        image={selectedImage || value || null}
        onCropComplete={handleCropComplete}
        title={title}
        defaultAspect={defaultAspect}
      />
    </div>
  );
};
