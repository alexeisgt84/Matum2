import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { Modal } from './Modal';
import { Button } from './Button';
import { getCroppedImg } from '../../lib/cropImage';
import { Scissors, Check } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface ImageCropperModalProps {
  isOpen: boolean;
  onClose: () => void;
  image: string | null;
  onCropComplete: (croppedImage: Blob) => void;
}

export const ImageCropperModal: React.FC<ImageCropperModalProps> = ({
  isOpen,
  onClose,
  image,
  onCropComplete,
}) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const onCropChange = (crop: { x: number; y: number }) => {
    setCrop(crop);
  };

  const onZoomChange = (zoom: number) => {
    setZoom(zoom);
  };

  const onCropAreaComplete = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleCrop = async () => {
    if (!image || !croppedAreaPixels) return;
    
    setLoading(true);
    try {
      const croppedImage = await getCroppedImg(image, croppedAreaPixels);
      if (croppedImage) {
        onCropComplete(croppedImage);
        onClose();
      }
    } catch (e: any) {
      console.error(e);
      toast.error('Error al procesar la imagen: ' + (e.message || 'Error desconocido'));
    } finally {
      setLoading(false);
    }
  };

  if (!image) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Recortar Imagen"
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
            className="flex-1" 
            onClick={handleCrop}
            loading={loading}
            icon={Check}
          >
            Confirmar
          </Button>
        </div>
      }
    >
      <div className="relative w-full aspect-square bg-background rounded-2xl overflow-hidden border border-white/5">
        <Cropper
          image={image}
          crop={crop}
          zoom={zoom}
          aspect={1}
          onCropChange={onCropChange}
          onCropComplete={onCropAreaComplete}
          onZoomChange={onZoomChange}
          objectFit="contain"
        />
      </div>
      
      <div className="mt-6 space-y-4">
        <div className="flex items-center gap-4">
          <Scissors size={18} className="text-gray-500" />
          <input
            type="range"
            value={zoom}
            min={1}
            max={3}
            step={0.1}
            aria-labelledby="Zoom"
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[var(--accent)]"
          />
        </div>
        <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest text-center">
          Arrastra para ajustar y usa la barra para hacer zoom
        </p>
      </div>
    </Modal>
  );
};
