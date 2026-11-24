import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import { toast } from 'react-hot-toast';
import { getCachedImageBlob, isOffline } from './offlineCache';

interface ShareOptions {
  title?: string;
  text?: string;
  url?: string;
  imageUrl?: string;
  imageUrls?: string[];
  watermark?: boolean;
}

const WATERMARK_LOGO_PATH = '/icon.png';
const WATERMARK_BRAND_TEXT = 'Nazaar';
const WATERMARK_DOMAIN_TEXT = 'nazaar.shop';
const WATERMARK_FONT_FAMILY =
  'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
let cachedLogoPromise: Promise<HTMLImageElement> | null = null;

function loadImageFromSrc(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`No se pudo cargar la imagen: ${src}`));
    img.src = src;
  });
}

function getWatermarkLogo(): Promise<HTMLImageElement> {
  if (!cachedLogoPromise) {
    cachedLogoPromise = loadImageFromSrc(WATERMARK_LOGO_PATH).catch((err) => {
      cachedLogoPromise = null;
      throw err;
    });
  }
  return cachedLogoPromise;
}

function drawRoundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): void {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

/**
 * Estampa una marca de agua discreta con el logo de Nazaar en la esquina inferior derecha.
 * Si el entorno o el canvas fallan, devuelve el Blob original como fallback seguro.
 */
export async function applyLogoWatermark(imageBlob: Blob): Promise<Blob> {
  if (
    typeof document === 'undefined' ||
    typeof URL === 'undefined' ||
    typeof URL.createObjectURL !== 'function'
  ) {
    return imageBlob;
  }

  let objectUrl: string | null = null;
  try {
    objectUrl = URL.createObjectURL(imageBlob);
    const [mainImg, logoImg] = await Promise.all([
      loadImageFromSrc(objectUrl),
      getWatermarkLogo(),
    ]);

    const width = mainImg.naturalWidth || mainImg.width;
    const height = mainImg.naturalHeight || mainImg.height;
    if (!width || !height) {
      return imageBlob;
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return imageBlob;
    }

    ctx.drawImage(mainImg, 0, 0, width, height);

    const minSide = Math.min(width, height);
    const logoSize = Math.max(24, Math.min(120, Math.round(minSide * 0.085)));
    const fontSize = Math.max(13, Math.round(logoSize * 0.48));
    const subFontSize = Math.max(9, Math.round(fontSize * 0.62));
    const lineGap = Math.max(2, Math.round(logoSize * 0.06));
    const paddingX = Math.max(10, Math.round(logoSize * 0.32));
    const paddingY = Math.max(6, Math.round(logoSize * 0.22));
    const gap = Math.max(6, Math.round(logoSize * 0.22));
    const margin = Math.max(12, Math.round(minSide * 0.028));

    const brandFont = `700 ${fontSize}px ${WATERMARK_FONT_FAMILY}`;
    const domainFont = `500 ${subFontSize}px ${WATERMARK_FONT_FAMILY}`;

    ctx.font = brandFont;
    const brandWidth = ctx.measureText(WATERMARK_BRAND_TEXT).width;
    ctx.font = domainFont;
    const domainWidth = ctx.measureText(WATERMARK_DOMAIN_TEXT).width;
    const textWidth = Math.max(brandWidth, domainWidth);

    const textBlockHeight = fontSize + lineGap + subFontSize;
    const contentHeight = Math.max(logoSize, textBlockHeight);
    const badgeWidth = paddingX * 2 + logoSize + gap + textWidth;
    const badgeHeight = contentHeight + paddingY * 2;
    const badgeX = Math.max(margin, width - badgeWidth - margin);
    const badgeY = Math.max(margin, height - badgeHeight - margin);
    const radius = badgeHeight / 2;

    drawRoundedRectPath(ctx, badgeX, badgeY, badgeWidth, badgeHeight, radius);
    ctx.fillStyle = 'rgba(12, 10, 24, 0.68)';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
    ctx.shadowBlur = Math.max(4, Math.round(logoSize * 0.15));
    ctx.shadowOffsetY = 2;
    ctx.fill();

    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = Math.max(1, Math.round(minSide * 0.002));
    ctx.stroke();

    const logoY = badgeY + (badgeHeight - logoSize) / 2;
    ctx.drawImage(logoImg, badgeX + paddingX, logoY, logoSize, logoSize);

    const textX = badgeX + paddingX + logoSize + gap;
    const textBlockTop = badgeY + (badgeHeight - textBlockHeight) / 2;

    ctx.textBaseline = 'middle';
    ctx.font = brandFont;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.fillText(WATERMARK_BRAND_TEXT, textX, textBlockTop + fontSize / 2);

    ctx.font = domainFont;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.78)';
    ctx.fillText(
      WATERMARK_DOMAIN_TEXT,
      textX,
      textBlockTop + fontSize + lineGap + subFontSize / 2
    );

    const outputType = imageBlob.type === 'image/png' ? 'image/png' : 'image/jpeg';
    const watermarkedBlob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((result) => resolve(result), outputType, 0.92);
    });

    return watermarkedBlob || imageBlob;
  } catch (error) {
    console.warn('Error applying logo watermark, using original image:', error);
    return imageBlob;
  } finally {
    if (objectUrl && typeof URL.revokeObjectURL === 'function') {
      URL.revokeObjectURL(objectUrl);
    }
  }
}

async function prepareShareImageBlob(imgUrl: string, watermark: boolean): Promise<Blob | null> {
  const rawBlob = await fetchImageBlobWithOfflineFallback(imgUrl);
  if (!rawBlob || !rawBlob.type.startsWith('image/')) {
    return null;
  }
  return watermark ? await applyLogoWatermark(rawBlob) : rawBlob;
}

async function fetchImageBlobWithOfflineFallback(imgUrl: string): Promise<Blob | null> {
  // Primero intentar desde la caché local si estamos sin conexión
  if (isOffline()) {
    const cached = await getCachedImageBlob(imgUrl);
    if (cached) return cached;
  }

  try {
    const response = await fetch(imgUrl);
    if (response.ok) {
      return await response.blob();
    }

    // Si un Service Worker previo devolvió una respuesta opaca (no-cors) en caché,
    // reintentar saltando la caché para obtener una respuesta CORS legible.
    if (response.type === 'opaque') {
      const sep = imgUrl.includes('?') ? '&' : '?';
      const freshResponse = await fetch(`${imgUrl}${sep}_cb=${Date.now()}`, {
        mode: 'cors',
        cache: 'no-store',
      });
      if (freshResponse.ok) {
        return await freshResponse.blob();
      }
    }
  } catch {
    // Fallback a caché offline si falla la red
  }

  return await getCachedImageBlob(imgUrl);
}

function buildTextWithUrl(text?: string, url?: string): string {
  const baseText = text || '';
  if (!url) return baseText;
  if (baseText.includes(url)) return baseText;
  return baseText ? `${baseText}\n\n${url}` : url;
}

/**
 * Utility to share content using Capacitor Share plugin (native) or Web Share API.
 * Fallbacks to clipboard if neither is available.
 */
export const shareContent = async (options: ShareOptions) => {
  const { title, text, url, imageUrl, imageUrls = [], watermark = true } = options;

  // Combine single imageUrl and imageUrls array
  const allImageUrls = [...(imageUrl ? [imageUrl] : []), ...imageUrls];

  // Prepare full text for clipboard and sharing
  const fullText = buildTextWithUrl(text, url);

  // Copy to clipboard automatically as fallback (useful for Facebook/Instagram which ignore text in share intents)
  if (fullText) {
    try {
      await navigator.clipboard.writeText(fullText);
      if (Capacitor.isNativePlatform() || (navigator as any).share) {
        toast.success('Texto copiado (listo para pegar)', { duration: 2000 });
      }
    } catch (err) {
      console.warn('Failed to auto-copy to clipboard:', err);
    }
  }

  try {
    const isNative = Capacitor.isNativePlatform();

    if (isNative) {
      const fileUris: string[] = [];

      if (allImageUrls.length > 0) {
        await Promise.all(
          allImageUrls.map(async (imgUrl) => {
            try {
              const blob = await prepareShareImageBlob(imgUrl, watermark);
              if (!blob) throw new Error('No se pudo obtener una imagen válida');

              const base64Data = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                  const result = reader.result as string;
                  if (!result) return reject(new Error('Failed to read blob as data URL'));
                  const commaIndex = result.indexOf(',');
                  if (commaIndex === -1) return reject(new Error('Invalid data URL format'));
                  const base64 = result.substring(commaIndex + 1);
                  resolve(base64);
                };
                reader.onerror = () => reject(new Error('FileReader error'));
                reader.readAsDataURL(blob);
              });

              const extension = blob.type.split('/')[1]?.split(';')[0] || 'jpg';
              const fileName = `share_${Date.now()}_${Math.random().toString(36).substring(7)}.${extension}`;

              const savedFile = await Filesystem.writeFile({
                path: fileName,
                data: base64Data,
                directory: Directory.Cache,
              });

              fileUris.push(savedFile.uri);
            } catch (error) {
              console.warn(`Error processing image ${imgUrl} for native share:`, error);
            }
          })
        );
      }

      const nativeShareOptions: any = {
        title: title || 'Nazaar',
        text: buildTextWithUrl(text, url),
      };

      if (fileUris.length > 0) {
        nativeShareOptions.files = fileUris;
      }

      await Share.share(nativeShareOptions);
    } else {
      // Browser logic (Web Share API)
      const shareData: any = {
        title: title || 'Nazaar',
        text: text || '',
      };

      if (url) {
        shareData.url = url;
      }

      if (allImageUrls.length > 0 && (navigator as any).canShare) {
        try {
          const files: File[] = [];

          await Promise.all(
            allImageUrls.map(async (imgUrl) => {
              try {
                const blob = await prepareShareImageBlob(imgUrl, watermark);
                if (blob) {
                  const extension = blob.type.split('/')[1]?.split(';')[0] || 'jpg';
                  const file = new File(
                    [blob],
                    `share-image-${Date.now()}-${Math.random().toString(36).substring(7)}.${extension}`,
                    { type: blob.type }
                  );
                  files.push(file);
                }
              } catch (err) {
                console.warn(`Could not fetch image ${imgUrl} for web share:`, err);
              }
            })
          );

          if (files.length > 0) {
            if (navigator.canShare({ ...shareData, files })) {
              shareData.files = files;
            } else if (
              navigator.canShare({
                title: shareData.title,
                text: buildTextWithUrl(text, url),
                files,
              })
            ) {
              // Muchos navegadores móviles no permiten url + files juntos; priorizar la imagen e incluir la URL en el texto
              delete shareData.url;
              shareData.text = buildTextWithUrl(text, url);
              shareData.files = files;
            }
          }
        } catch (error) {
          console.warn('Error processing images for web share:', error);
        }
      }

      if ((navigator as any).share) {
        try {
          await navigator.share(shareData);
        } catch (shareError: any) {
          if (shareError.name === 'AbortError') return;

          if (shareData.files && shareData.url) {
            const filesOnlyData = {
              title: shareData.title,
              text: buildTextWithUrl(text, url),
              files: shareData.files,
            };
            try {
              await navigator.share(filesOnlyData);
              return;
            } catch (filesRetryError: any) {
              if (filesRetryError.name === 'AbortError') return;
            }
          }

          if (shareData.files) {
            const fallbackData: any = {
              title: shareData.title,
              text: text || '',
            };
            if (url) fallbackData.url = url;
            try {
              await navigator.share(fallbackData);
            } catch (retryError: any) {
              if (retryError.name !== 'AbortError') throw retryError;
            }
          } else {
            throw shareError;
          }
        }
      } else {
        const parts = [];
        if (title) parts.push(`*${title}*`);
        const bodyWithUrl = buildTextWithUrl(text, url);
        if (bodyWithUrl) parts.push(bodyWithUrl);

        const contentToCopy = parts.join('\n\n');
        try {
          await navigator.clipboard.writeText(contentToCopy);
          toast.success('Contenido copiado al portapapeles');
        } catch (clipErr) {
          console.error('Clipboard fallback failed:', clipErr);
          toast.error('No se pudo copiar al portapapeles');
        }
      }
    }
  } catch (err: any) {
    if (err.name !== 'AbortError') {
      console.error('Share failed detailed error:', err);
      const errorMsg = err.message || 'Error desconocido';
      toast.error(`No se pudo compartir: ${errorMsg}`);
    }
  }
};
