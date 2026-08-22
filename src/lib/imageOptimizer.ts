import heic2any from 'heic2any';

export interface OptimizeConfig {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'image/jpeg' | 'image/png' | 'image/webp';
  targetMegapixels?: number;
}

export interface ImageMetaData {
  width: number;
  height: number;
  megapixels: number;
  sizeBytes: number;
  format: string;
}

const DEFAULT_CONFIG: OptimizeConfig = {
  maxWidth: 1920,
  maxHeight: 1920,
  quality: 0.85,
  format: 'image/webp',
};

/**
 * Calcula megapíxeles a partir de ancho y alto (ej. 4000x3000 = 12.00 MP)
 */
export const calculateMegapixels = (width: number, height: number): number => {
  if (!width || !height) return 0;
  return Number(((width * height) / 1000000).toFixed(2));
};

/**
 * Formatea bytes a un formato legible (B, KB, MB)
 */
export const formatBytes = (bytes: number, decimals = 1): string => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

/**
 * Pre-escala una imagen si su tamaño en archivo es mayor a 800KB o su resolución es muy alta.
 * Esto evita cuelgues por consumo masivo de memoria RAM en navegadores y WebViews de teléfonos móviles.
 */
export const preScaleImage = async (
  file: Blob | File,
  maxDimension = 1200
): Promise<Blob> => {
  if (!file || !(file instanceof Blob)) return file;
  
  // Si el archivo es de menos de 800KB, no hace falta pre-escalar
  if (file.size < 800 * 1024) {
    return file;
  }

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    const cleanup = () => {
      URL.revokeObjectURL(url);
    };

    img.onload = () => {
      let width = img.width;
      let height = img.height;

      if (width <= maxDimension && height <= maxDimension) {
        cleanup();
        resolve(file);
        return;
      }

      if (width > height) {
        height = Math.round((height * maxDimension) / width);
        width = maxDimension;
      } else {
        width = Math.round((width * maxDimension) / height);
        height = maxDimension;
      }

      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, width);
      canvas.height = Math.max(1, height);
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        cleanup();
        resolve(file);
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      cleanup();
      canvas.toBlob(
        (blob) => {
          resolve(blob || file);
        },
        'image/jpeg',
        0.85
      );
    };

    img.onerror = () => {
      cleanup();
      resolve(file); // En caso de cualquier fallo, retornar el archivo original
    };

    img.src = url;
  });
};

/**
 * Obtiene dimensiones de una imagen sin decodificarla (lectura binaria de cabecera)
 */
const getImageDimensions = async (file: Blob): Promise<{width: number, height: number}> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const buffer = new Uint8Array(reader.result as ArrayBuffer);
        
        // JPEG
        if (buffer[0] === 0xFF && buffer[1] === 0xD8) {
          let pos = 2;
          while (pos < buffer.length - 8) {
            if (buffer[pos] === 0xFF && (buffer[pos+1] >= 0xC0 && buffer[pos+1] <= 0xCF && buffer[pos+1] !== 0xC4 && buffer[pos+1] !== 0xC8 && buffer[pos+1] !== 0xCC)) {
              resolve({
                height: (buffer[pos + 5] << 8) | buffer[pos + 6],
                width: (buffer[pos + 7] << 8) | buffer[pos + 8]
              });
              return;
            }
            if (buffer[pos] !== 0xFF) break;
            const length = (buffer[pos+2] << 8) | buffer[pos+3];
            pos += 2 + length;
            if (length < 2) break; // Evitar loops infinitos en archivos corruptos
          }
        }
        
        // PNG
        if (buffer[0] === 0x89 && buffer[1] === 0x50) {
          resolve({
            width: (buffer[16] << 24) | (buffer[17] << 16) | (buffer[18] << 8) | buffer[19],
            height: (buffer[20] << 24) | (buffer[21] << 16) | (buffer[22] << 8) | buffer[23]
          });
          return;
        }

        // WebP
        if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[8] === 0x57 && buffer[9] === 0x45) {
          // WebP VP8 (Simple)
          if (buffer[12] === 0x56 && buffer[13] === 0x50 && buffer[14] === 0x38 && buffer[15] === 0x20) {
             resolve({
               width: (buffer[26] | (buffer[27] << 8)) & 0x3FFF,
               height: (buffer[28] | (buffer[29] << 8)) & 0x3FFF
             });
             return;
          }
          // WebP VP8X (Extended)
          if (buffer[12] === 0x56 && buffer[13] === 0x50 && buffer[14] === 0x38 && buffer[15] === 0x58) {
            resolve({
              width: 1 + (buffer[24] | (buffer[25] << 8) | (buffer[26] << 16)),
              height: 1 + (buffer[27] | (buffer[28] << 8) | (buffer[29] << 16))
            });
            return;
          }
        }
      } catch (e) {
        console.warn('Error leyendo dimensiones binarias:', e);
      }

      // Fallback seguro a HTMLImageElement
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const dims = { width: img.width || 800, height: img.height || 800 };
        URL.revokeObjectURL(url);
        resolve(dims);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve({ width: 800, height: 800 });
      };
      img.src = url;
    };
    reader.onerror = () => resolve({ width: 800, height: 800 });
    reader.readAsArrayBuffer(file);
  });
};

/**
 * Optimiza un archivo de imagen (File o Blob)
 */
export const optimizeImage = async (
  file: File | Blob,
  config: OptimizeConfig = {}
): Promise<Blob> => {
  const settings = { ...DEFAULT_CONFIG, ...config };
  
  if (!file || !(file instanceof Blob)) {
    throw new Error('Archivo no válido');
  }

  // Pre-escalar si es muy pesada para asegurar estabilidad en celulares
  let processingFile = await preScaleImage(file, Math.max(settings.maxWidth || 800, settings.maxHeight || 800, 1200));
  const fileName = (file as File).name || 'image.jpg';
  const extension = fileName.split('.').pop()?.toLowerCase();
  
  // Soporte para HEIC (iPhone)
  if (file.type.includes('heic') || file.type.includes('heif') || extension === 'heic' || extension === 'heif') {
    try {
      const converted = await heic2any({
        blob: processingFile,
        toType: 'image/jpeg',
        quality: 0.8
      });
      processingFile = Array.isArray(converted) ? converted[0] : converted;
    } catch (err) {
      console.warn('Error HEIC:', err);
    }
  }

  // 1. Obtener dimensiones sin cargar la imagen entera
  let orig: {width: number, height: number};
  try {
    orig = await getImageDimensions(processingFile);
  } catch (e: any) {
    orig = { width: 800, height: 800 };
  }

  // 2. Calcular dimensiones finales
  let targetWidth = orig.width;
  let targetHeight = orig.height;
  const maxW = settings.maxWidth || 800;
  const maxH = settings.maxHeight || 800;

  if (targetWidth > targetHeight) {
    if (targetWidth > maxW) {
      targetHeight = Math.round((targetHeight * maxW) / targetWidth);
      targetWidth = maxW;
    }
  } else {
    if (targetHeight > maxH) {
      targetWidth = Math.round((targetWidth * maxH) / targetHeight);
      targetHeight = maxH;
    }
  }

  // 3. Procesar con Bitmap (Memoria eficiente)
  if (typeof window.createImageBitmap === 'function') {
    try {
      const bitmap = await window.createImageBitmap(processingFile, {
        resizeWidth: targetWidth,
        resizeHeight: targetHeight,
        resizeQuality: 'high'
      });

      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas Error');
      
      ctx.drawImage(bitmap, 0, 0);
      bitmap.close();
      
      return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Error final'));
        }, settings.format, settings.quality);
      });
    } catch (e) {
      console.warn('Bitmap falló, usando fallback...');
    }
  }

  // 4. Fallback tradicional (solo si falla lo anterior)
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(processingFile);
    
    const timeout = setTimeout(() => {
      URL.revokeObjectURL(url);
      reject(new Error('La imagen es demasiado pesada para este teléfono.'));
    }, 15000);

    img.onload = () => {
      clearTimeout(timeout);
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Error en fallback'));
        }, settings.format, settings.quality);
      }
    };
    img.onerror = () => {
      clearTimeout(timeout);
      URL.revokeObjectURL(url);
      const sizeMB = (processingFile.size / (1024 * 1024)).toFixed(2);
      reject(new Error(`Error de memoria (${sizeMB}MB). Esta imagen es demasiado grande para tu teléfono.`));
    };
    img.src = url;
  });
};

/**
 * Convierte un Blob en un File si es necesario
 */
export const blobToFile = (blob: Blob, fileName: string): File => {
  if (!blob) {
    throw new Error('No se puede convertir un Blob nulo en un File');
  }
  let ext = '.jpg';
  if (blob.type === 'image/webp') ext = '.webp';
  else if (blob.type === 'image/png') ext = '.png';
  
  let finalName = fileName;
  const currentExtIndex = finalName.lastIndexOf('.');
  if (currentExtIndex !== -1) {
    finalName = finalName.substring(0, currentExtIndex) + ext;
  } else {
    finalName += ext;
  }
  return new File([blob], finalName, { type: blob.type || 'image/jpeg' });
};

/**
 * Obtiene los metadatos y megapíxeles completos de un Blob o File
 */
export const getImageMetadata = async (file: Blob | File): Promise<ImageMetaData> => {
  const sizeBytes = file.size;
  const format = file.type || 'image/jpeg';
  let dims = { width: 800, height: 800 };
  
  try {
    dims = await getImageDimensions(file);
  } catch (e) {
    console.warn('Fallback dimensiones en metadata', e);
  }

  const mp = calculateMegapixels(dims.width, dims.height);
  return {
    width: dims.width,
    height: dims.height,
    megapixels: mp,
    sizeBytes,
    format
  };
};

/**
 * Procesa y recupera imagen optimizada con recorte, rotación, formateo y límite de megapíxeles para el Studio.
 */
export interface StudioProcessOptions {
  pixelCrop?: { x: number; y: number; width: number; height: number };
  rotation?: number;
  flip?: { horizontal: boolean; vertical: boolean };
  format?: 'image/webp' | 'image/jpeg' | 'image/png';
  quality?: number; // 0.1 a 1.0
  maxMegapixels?: number; // Ej. 2.0 MP
  maxDimension?: number; // Ej. 1920px
}

export const processStudioImage = async (
  imageSrc: string | Blob,
  options: StudioProcessOptions = {}
): Promise<{ blob: Blob; metadata: ImageMetaData }> => {
  const {
    pixelCrop,
    rotation = 0,
    flip = { horizontal: false, vertical: false },
    format = 'image/webp',
    quality = 0.85,
    maxMegapixels = 2.0,
    maxDimension
  } = options;

  let sourceBlob: Blob;
  if (typeof imageSrc === 'string') {
    const res = await fetch(imageSrc);
    sourceBlob = await res.blob();
  } else {
    sourceBlob = imageSrc;
  }

  // Pre-escalar primero si sobrepasa 2MP o 1200px para seguridad de memoria canvas
  let processingBlob = await preScaleImage(sourceBlob, 2400);

  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(processingBlob);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      
      const cropX = pixelCrop?.x ?? 0;
      const cropY = pixelCrop?.y ?? 0;
      const cropW = pixelCrop?.width ?? img.width;
      const cropH = pixelCrop?.height ?? img.height;

      // Calcular escalado basado en maxMegapixels y maxDimension
      let targetW = cropW;
      let targetH = cropH;

      // 1. Limite por megapíxeles objetivo (ej. 2MP => max ~2,000,000 px totales)
      const currentCropMP = (cropW * cropH) / 1000000;
      if (maxMegapixels && currentCropMP > maxMegapixels) {
        const scaleFactor = Math.sqrt(maxMegapixels / currentCropMP);
        targetW = Math.round(cropW * scaleFactor);
        targetH = Math.round(cropH * scaleFactor);
      }

      // 2. Limite por dimensión máxima si se especificó
      if (maxDimension) {
        if (targetW > maxDimension || targetH > maxDimension) {
          if (targetW > targetH) {
            targetH = Math.round((targetH * maxDimension) / targetW);
            targetW = maxDimension;
          } else {
            targetW = Math.round((targetW * maxDimension) / targetH);
            targetH = maxDimension;
          }
        }
      }

      targetW = Math.max(1, targetW);
      targetH = Math.max(1, targetH);

      const canvas = document.createElement('canvas');
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('No se pudo crear el contexto del canvas'));
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Si no hay rotación ni volteo
      if (rotation === 0 && !flip.horizontal && !flip.vertical) {
        ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, targetW, targetH);
      } else {
        ctx.save();
        ctx.translate(targetW / 2, targetH / 2);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.scale(flip.horizontal ? -1 : 1, flip.vertical ? -1 : 1);
        ctx.translate(-targetW / 2, -targetH / 2);
        ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, targetW, targetH);
        ctx.restore();
      }

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Error al procesar y convertir la imagen'));
            return;
          }
          const metadata: ImageMetaData = {
            width: targetW,
            height: targetH,
            megapixels: calculateMegapixels(targetW, targetH),
            sizeBytes: blob.size,
            format: blob.type || format
          };
          resolve({ blob, metadata });
        },
        format,
        quality
      );
    };

    img.onerror = (err) => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Error al cargar la imagen en el procesador'));
    };

    img.src = objectUrl;
  });
};

