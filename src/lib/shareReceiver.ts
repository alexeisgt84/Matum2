import { registerPlugin, Capacitor } from '@capacitor/core';

export interface RawSharedData {
  text?: string;
  imagePath?: string;
}

export interface ProcessedSharedContent {
  description: string;
  file?: File;
  preview?: string;
  imagePath?: string;
}

interface ShareReceiverPlugin {
  getSharedData(): Promise<RawSharedData>;
  clearSharedData(): Promise<void>;
  addListener(eventName: 'onShareReceived', listenerFunc: (data: RawSharedData) => void): Promise<any>;
}

const ShareReceiver = registerPlugin<ShareReceiverPlugin>('ShareReceiver');

export { ShareReceiver };

/**
 * Convierte un path de archivo nativo de Android en un objeto File de JS
 * descargándolo temporalmente en memoria a través del WebView.
 */
export async function processSharedData(raw: RawSharedData): Promise<ProcessedSharedContent> {
  const result: ProcessedSharedContent = {
    description: raw.text || '',
  };

  if (raw.imagePath && Capacitor.isNativePlatform()) {
    try {
      const webUrl = Capacitor.convertFileSrc(raw.imagePath);
      const response = await fetch(webUrl);
      const blob = await response.blob();
      
      const extension = blob.type.split('/')[1]?.split(';')[0] || 'jpg';
      const fileName = `shared_image_${Date.now()}.${extension}`;
      const file = new File([blob], fileName, { type: blob.type });
      
      result.file = file;
      result.preview = URL.createObjectURL(blob);
    } catch (err) {
      console.error('Error processing shared image file:', err);
    }
  }

  return result;
}
