
export const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    
    // Tiempo de espera para evitar que se quede colgado
    const timeout = setTimeout(() => {
      image.onload = null;
      image.onerror = null;
      reject(new Error('Tiempo de espera agotado al cargar la imagen para recortar.'));
    }, 15000);

    image.addEventListener('load', () => {
      clearTimeout(timeout);
      resolve(image);
    });

    image.addEventListener('error', (error) => {
      clearTimeout(timeout);
      console.error('Error cargando imagen en el cropper:', error, 'URL:', url.substring(0, 50) + '...');
      reject(new Error('No se pudo cargar la imagen para recortar. Intenta con una imagen más pequeña o de otro formato.'));
    });
    
    // Solo establecer crossOrigin para URLs externas. 
    // Las URLs locales (blob:, data:, capacitor:) no lo permiten y fallan si se establece.
    if (url.startsWith('http') && !url.includes('localhost') && !url.includes('127.0.0.1')) {
      image.setAttribute('crossOrigin', 'anonymous');
    }
    
    image.src = url;
  });

export async function getCroppedImg(
  imageSrc: string,
  pixelCrop: { x: number; y: number; width: number; height: number },
  rotation = 0,
  flip = { horizontal: false, vertical: false },
  maxOutputSize = 1000
): Promise<Blob | null> {
  const image = await createImage(imageSrc);

  // Limitar dimensiones finales del recorte a un máximo razonable (1000px por defecto)
  let outWidth = pixelCrop.width;
  let outHeight = pixelCrop.height;
  if (outWidth > maxOutputSize || outHeight > maxOutputSize) {
    if (outWidth > outHeight) {
      outHeight = Math.round((outHeight * maxOutputSize) / outWidth);
      outWidth = maxOutputSize;
    } else {
      outWidth = Math.round((outWidth * maxOutputSize) / outHeight);
      outHeight = maxOutputSize;
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, outWidth);
  canvas.height = Math.max(1, outHeight);
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return null;
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  if (rotation === 0 && !flip.horizontal && !flip.vertical) {
    // Ruta rápida y eficiente: recorta y escala directamente al canvas final (cero RAM extra)
    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      outWidth,
      outHeight
    );
  } else {
    // Ruta con rotación/volteado: transforma el contexto y dibuja sobre el canvas final
    const scaleX = outWidth / pixelCrop.width;
    const scaleY = outHeight / pixelCrop.height;

    ctx.save();
    ctx.scale(scaleX, scaleY);
    ctx.translate(-pixelCrop.x, -pixelCrop.y);

    const { width: bBoxWidth, height: bBoxHeight } = rotateSize(
      image.width,
      image.height,
      rotation
    );
    const rotRad = (rotation * Math.PI) / 180;

    ctx.translate(bBoxWidth / 2, bBoxHeight / 2);
    ctx.rotate(rotRad);
    ctx.scale(flip.horizontal ? -1 : 1, flip.vertical ? -1 : 1);
    ctx.translate(-image.width / 2, -image.height / 2);

    ctx.drawImage(image, 0, 0);
    ctx.restore();
  }

  return new Promise((resolve) => {
    canvas.toBlob(
      (file) => {
        resolve(file);
      },
      'image/jpeg',
      0.85
    );
  });
}

function rotateSize(width: number, height: number, rotation: number) {
  const rotRad = (rotation * Math.PI) / 180;

  return {
    width:
      Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
    height:
      Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
  };
}
