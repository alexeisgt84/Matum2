import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import { toast } from 'react-hot-toast';

interface ShareOptions {
  title?: string;
  text?: string;
  url?: string;
  imageUrl?: string;
}

/**
 * Utility to share content using Capacitor Share plugin (native) or Web Share API.
 * Fallbacks to clipboard if neither is available.
 */
export const shareContent = async (options: ShareOptions) => {
  const { title, text, url, imageUrl } = options;

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
      let fileUri: string | undefined;

      if (imageUrl) {
        try {
          // Download image and save to cache for sharing
          const response = await fetch(imageUrl);
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
          const fileName = `share_${Date.now()}.${extension}`;
          
          // On Android, we should ensure the file is in a place where it can be shared
          const savedFile = await Filesystem.writeFile({
            path: fileName,
            data: base64Data,
            directory: Directory.Cache
          });
          
          fileUri = savedFile.uri;
        } catch (error) {
          console.warn('Error processing image for native share, continuing with text only:', error);
        }
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

      if (fileUri) {
        nativeShareOptions.files = [fileUri];
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
      } else {
        // If no URL provided, we might still want the current location as fallback
        // but only if we are not sharing files, as some browsers (Safari)
        // have issues sharing both files and URL sometimes
      }

      // Try to include image if provided and supported
      if (imageUrl) {
        try {
          const response = await fetch(imageUrl);
          if (response.ok) {
            const blob = await response.blob();
            // Check if browsing context supports sharing files
            if ((navigator as any).canShare) {
              const extension = blob.type.split('/')[1]?.split(';')[0] || 'jpg';
              const file = new File([blob], `share-image.${extension}`, { type: blob.type });

              if (navigator.canShare({ files: [file] })) {
                shareData.files = [file];
              }
            }
          }
        } catch (error) {
          console.warn('Could not fetch image for web share (likely CORS), continuing with text:', error);
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

