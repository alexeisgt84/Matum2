import React from 'react';
import { ImageStudioModal } from './ImageStudioModal';

interface ImageCropperModalProps {
  isOpen: boolean;
  onClose: () => void;
  image: string | null;
  onCropComplete: (croppedImage: Blob) => void;
  title?: string;
  defaultAspect?: number;
}

export const ImageCropperModal: React.FC<ImageCropperModalProps> = ({
  isOpen,
  onClose,
  image,
  onCropComplete,
  title = 'Studio de Imágenes',
  defaultAspect = 1
}) => {
  return (
    <ImageStudioModal
      isOpen={isOpen}
      onClose={onClose}
      image={image}
      title={title}
      defaultAspect={defaultAspect}
      onProcessComplete={(processedFile) => {
        onCropComplete(processedFile);
      }}
    />
  );
};

