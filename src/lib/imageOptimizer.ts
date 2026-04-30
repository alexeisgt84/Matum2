import heic2any from 'heic2any';

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
 * Obtiene dimensiones de una imagen sin decodificarla (lectura binaria de cabecera)
 */
const getImageDimensions = async (file: Blob): Promise<{width: number, height: number}> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const buffer = new Uint8Array(reader.result as ArrayBuffer);
      
      // JPEG
      if (buffer[0] === 0xFF && buffer[1] === 0xD8) {
        let pos = 2;
        while (pos < buffer.length - 8) {
          if (buffer[pos] === 0xFF && (buffer[pos+1] >= 0xC0 && buffer[pos+1] <= 0xC3)) {
            resolve({
              height: (buffer[pos + 5] << 8) | buffer[pos + 6],
              width: (buffer[pos + 7] << 8) | buffer[pos + 8]
            });
            return;
          }
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

      // Fallback a método tradicional solo si es pequeño, para evitar crash
      if (file.size < 2 * 1024 * 1024) {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
          const dims = { width: img.width, height: img.height };
          URL.revokeObjectURL(url);
          resolve(dims);
        };
        img.onerror = () => {
          URL.revokeObjectURL(url);
          reject(new Error('Formato no reconocido o archivo dañado'));
        };
        img.src = url;
      } else {
        reject(new Error('No se pudo leer la cabecera de esta imagen grande'));
      }
    };
    reader.onerror = () => reject(new Error('Error al leer archivo'));
    reader.readAsArrayBuffer(file.slice(0, 65536));
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

  let processingFile = file;
  const fileName = (file as File).name || 'image.jpg';
  const extension = fileName.split('.').pop()?.toLowerCase();
  
  // Soporte para HEIC (iPhone)
  if (file.type.includes('heic') || file.type.includes('heif') || extension === 'heic' || extension === 'heif') {
    try {
      const converted = await heic2any({
        blob: file,
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
    const sizeMB = (processingFile.size / (1024 * 1024)).toFixed(2);
    throw new Error(`Error al leer imagen (${processingFile.type || 'tipo desconocido'}, ${sizeMB}MB): ${e.message || 'Error de formato'}`);
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
  // Asegurar que el nombre tenga extensión correcta si es un JPEG optimizado
  let finalName = fileName;
  if (!finalName.toLowerCase().endsWith('.jpg') && !finalName.toLowerCase().endsWith('.jpeg') && blob.type === 'image/jpeg') {
    finalName += '.jpg';
  }
  return new File([blob], finalName, { type: blob.type || 'image/jpeg' });
};
