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
  } catch {
    // Fallback a caché offline si falla la red
  }

  return await getCachedImageBlob(imgUrl);
}

/**
 * Utility to share content using Capacitor Share plugin (native) or Web Share API.
 * Fallbacks to clipboard if neither is available.
 */
export const shareContent = async (options: ShareOptions) => {
  const { title, text, url, imageUrl, imageUrls = [] } = options;

  // Combine single imageUrl and imageUrls array
  const allImageUrls = [...(imageUrl ? [imageUrl] : []), ...imageUrls];

  // Prepare full text for clipboard and sharing
  const fullTextParts = [];
  if (text) fullTextParts.push(text);
  if (url) fullTextParts.push(url);
  const fullText = fullTextParts.join('\n\n');

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
              const blob = await fetchImageBlobWithOfflineFallback(imgUrl);
              if (!blob) throw new Error('No se pudo obtener la imagen');

              if (!blob.type.startsWith('image/')) {
                throw new Error('Fetched file is not an image');
              }

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
        title: title || 'Matum 2',
        text: text || '',
      };

      if (url) {
        if (nativeShareOptions.text) {
          nativeShareOptions.text += `\n\n${url}`;
        } else {
          nativeShareOptions.text = url;
        }
      }

      if (fileUris.length > 0) {
        nativeShareOptions.files = fileUris;
      }

      await Share.share(nativeShareOptions);
    } else {
      // Browser logic (Web Share API)
      const shareData: any = {
        title: title || 'Matum 2',
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
                const blob = await fetchImageBlobWithOfflineFallback(imgUrl);
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

          if (files.length > 0 && navigator.canShare({ files })) {
            shareData.files = files;
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

          if (shareData.files) {
            const fallbackData = { ...shareData };
            delete fallbackData.files;
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
        if (text) parts.push(text);
        if (url) parts.push(url);

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
