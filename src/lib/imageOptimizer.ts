/**
 * Utilidad para optimizar imágenes en el navegador/Capacitor
 * Inspirado en la lógica de NEMU pero adaptado para Web usando Canvas
 */

export interface OptimizeConfig {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'image/jpeg' | 'image/png' | 'image/webp';
}

const DEFAULT_CONFIG: OptimizeConfig = {
  maxWidth: 800,
  maxHeight: 800,
  quality: 0.7,
  format: 'image/jpeg',
};

/**
 * Optimiza un archivo de imagen (File o Blob)
 */
export const optimizeImage = async (
  file: File | Blob,
  config: OptimizeConfig = {}
): Promise<Blob> => {
  const settings = { ...DEFAULT_CONFIG, ...config };
  
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        // Calcular nuevas dimensiones manteniendo el aspect ratio
        if (width > height) {
          if (width > (settings.maxWidth || 800)) {
            height = Math.round((height * (settings.maxWidth || 800)) / width);
            width = settings.maxWidth || 800;
          }
        } else {
          if (height > (settings.maxHeight || 800)) {
            width = Math.round((width * (settings.maxHeight || 800)) / height);
            height = settings.maxHeight || 800;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('No se pudo obtener el contexto del canvas'));
          return;
        }
        
        // Dibujar imagen redimensionada
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convertir a blob comprimido
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Error al generar el Blob de la imagen'));
            }
          },
          settings.format,
          settings.quality
        );
      };
      
      img.onerror = (err) => reject(err);
    };
    
    reader.onerror = (err) => reject(err);
  });
};

/**
 * Convierte un Blob en un File si es necesario
 */
export const blobToFile = (blob: Blob, fileName: string): File => {
  return new File([blob], fileName, { type: blob.type });
};
