import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import { toast } from 'react-hot-toast';

interface ShareOptions {
  title?: string;
  text?: string;
  url?: string;
  imageUrl?: string;
  imageUrls?: string[];
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
      // Let user know it's ready to paste for apps that ignore the text field
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
        // Process images in parallel
        await Promise.all(allImageUrls.map(async (imgUrl) => {
          try {
            // Download image and save to cache for sharing
            const response = await fetch(imgUrl);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            const blob = await response.blob();
            
            // Basic validation that we actually got an image
            if (!blob.type.startsWith('image/')) {
              throw new Error('Fetched file is not an image');
            }

            const base64Data = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => {
                const result = reader.result as string;
                if (!result) return reject(new Error('Failed to read blob as data URL'));
                // Remove data:image/xxx;base64, prefix
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
            
            // On Android, we should ensure the file is in a place where it can be shared
            const savedFile = await Filesystem.writeFile({
              path: fileName,
              data: base64Data,
              directory: Directory.Cache
            });
            
            fileUris.push(savedFile.uri);
          } catch (error) {
            console.warn(`Error processing image ${imgUrl} for native share:`, error);
          }
        }));
      }

      // Prepare share options for Native
      const nativeShareOptions: any = {
        title: title || 'Matum 2',
        text: text || '',
      };
      
      if (url) {
        // Many apps handle text + url better if they are joined in the text field
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

      // Try to include images if provided and supported
      if (allImageUrls.length > 0 && (navigator as any).canShare) {
        try {
          const files: File[] = [];
          
          await Promise.all(allImageUrls.map(async (imgUrl) => {
            try {
              const response = await fetch(imgUrl);
              if (response.ok) {
                const blob = await response.blob();
                const extension = blob.type.split('/')[1]?.split(';')[0] || 'jpg';
                const file = new File([blob], `share-image-${Date.now()}-${Math.random().toString(36).substring(7)}.${extension}`, { type: blob.type });
                files.push(file);
              }
            } catch (err) {
              console.warn(`Could not fetch image ${imgUrl} for web share:`, err);
            }
          }));

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
          
          // If sharing with files failed, try one last time with just text/url
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
        // Fallback for Desktop/Unshared Browsers
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

