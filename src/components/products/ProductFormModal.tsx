import React, { useState, useEffect, useRef } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import type { Product, ProductForm } from '../../types/product';
import { Camera, Save, Tag, Send, ImagePlus } from 'lucide-react';
import { Camera as CapCamera, CameraResultType, CameraSource } from '@capacitor/camera';
import { ImageCropperModal } from '../ui/ImageCropperModal';
import { blobToFile } from '../../lib/imageOptimizer';
import heic2any from 'heic2any';
import { toast } from 'react-hot-toast';

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (form: ProductForm, id?: string, file?: File, shouldSend?: boolean) => Promise<boolean>;
  product?: Product | null;
  loading?: boolean;
}

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  product,
  loading = false,
}) => {
  const [form, setForm] = useState<ProductForm>({
    name: '',
    description: '',
    price: '',
    currency: 'USD',
    imagen_url: null,
  });
  const [file, setFile] = useState<File | undefined>();
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (product) {
      setForm({
        name: product.name,
        description: product.description || '',
        price: product.price?.toString() || '',
        currency: product.currency || 'USD',
        imagen_url: product.imagen_url,
      });
      setPreview(product.imagen_url);
    } else {
      setForm({ name: '', description: '', price: '', currency: 'USD', imagen_url: null });
      setPreview(null);
      setFile(undefined);
    }
  }, [product, isOpen]);

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
            className="w-32 h-32 rounded-2xl bg-white/5 border-2 border-dashed border-white/10 flex items-center justify-center relative overflow-hidden group hover:border-[var(--accent)]/50 transition-colors cursor-pointer"
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
              disabled={isConverting}
            />
          </div>
        </div>

        <div className="space-y-4">
          <Input
            label="Nombre del Producto"
            placeholder="Ej: Pizza Margherita"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            autoFocus
          />

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <Input
                label="Precio"
                type="number"
                placeholder="0.00"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                icon={Tag}
              />
            </div>
            <div>
              <div className="w-full space-y-2">
                <label className="text-sm font-medium text-gray-400 ml-1">Moneda</label>
                <select
                  className="w-full h-[58px] bg-[#1a1a1a] border border-white/5 rounded-xl px-4 text-white outline-none focus:border-[var(--accent)] appearance-none cursor-pointer"
                  value={form.currency}
                  onChange={(e) => setForm({ ...form, currency: e.target.value })}
                >
                  <option value="USD">USD</option>
                  <option value="CUP">CUP</option>
                  <option value="MLC">MLC</option>
                </select>
              </div>
            </div>
          </div>

          <Input
            label="Descripción (Opcional)"
            placeholder="Ej: Salsa de tomate, mozzarella y albahaca fresca"
            multiline
            rows={3}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>
      </form>

      <ImageCropperModal
        isOpen={isCropperOpen}
        onClose={() => setIsCropperOpen(false)}
        image={selectedImage}
        onCropComplete={handleCropComplete}
      />
    </Modal>
  );
};
