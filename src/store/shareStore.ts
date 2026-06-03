import { create } from 'zustand';
import { ShareReceiver, processSharedData } from '../lib/shareReceiver';
import type { ProcessedSharedContent, RawSharedData } from '../lib/shareReceiver';
import { Capacitor } from '@capacitor/core';

interface ShareStore {
  sharedContentList: ProcessedSharedContent[];
  addSharedContent: (content: ProcessedSharedContent) => void;
  removeSharedContent: (index: number) => void;
  clearAllSharedContent: () => Promise<void>;
  initListener: () => void;
}

// Persistencia en localStorage: Guarda datos serializables
const savePersistedShares = (list: ProcessedSharedContent[]) => {
  try {
    const serializable = list.map(item => ({
      description: item.description,
      preview: item.preview,
      imagePath: item.imagePath
    }));
    localStorage.setItem('matum_shared_queue', JSON.stringify(serializable));
  } catch (e) {
    console.error('Failed to persist shared queue:', e);
  }
};

// Carga asíncrona de persistencia: Reconstruye los archivos File si existe imagePath nativo
const loadPersistedShares = async (): Promise<ProcessedSharedContent[]> => {
  try {
    const raw = localStorage.getItem('matum_shared_queue');
    if (!raw) return [];
    const parsed = JSON.parse(raw) as any[];
    
    const processedList = await Promise.all(parsed.map(async (item) => {
      if (item.imagePath && Capacitor.isNativePlatform()) {
        try {
          const processed = await processSharedData({ text: item.description, imagePath: item.imagePath });
          return {
            ...processed,
            imagePath: item.imagePath
          };
        } catch (err) {
          console.warn('Failed to rebuild persisted file:', err);
          return item;
        }
      }
      return item;
    }));
    return processedList;
  } catch (e) {
    return [];
  }
};

export const useShareStore = create<ShareStore>((set, get) => ({
  sharedContentList: [],
  
  addSharedContent: (content) => {
    const newList = [...get().sharedContentList, content];
    set({ sharedContentList: newList });
    savePersistedShares(newList);
  },
  
  removeSharedContent: (index) => {
    const current = get().sharedContentList;
    const item = current[index];
    if (item && item.preview && item.preview.startsWith('blob:')) {
      URL.revokeObjectURL(item.preview);
    }
    const newList = current.filter((_, i) => i !== index);
    set({ sharedContentList: newList });
    savePersistedShares(newList);
  },
  
  clearAllSharedContent: async () => {
    const current = get().sharedContentList;
    current.forEach(item => {
      if (item.preview && item.preview.startsWith('blob:')) {
        URL.revokeObjectURL(item.preview);
      }
    });
    set({ sharedContentList: [] });
    localStorage.removeItem('matum_shared_queue');
    if (Capacitor.isNativePlatform()) {
      try {
        await ShareReceiver.clearSharedData();
      } catch (err) {
        console.warn('Failed to clear native shared data:', err);
      }
    }
  },
  
  initListener: () => {
    // 1. Cargar e inicializar la cola persistida
    loadPersistedShares().then((persisted) => {
      set({ sharedContentList: persisted });

      if (!Capacitor.isNativePlatform()) return;

      // 2. Chequear si hay un compartido inicial al iniciar
      ShareReceiver.getSharedData().then(async (data) => {
        if (data.text || data.imagePath) {
          const processed = await processSharedData(data);
          const processedWithSource = { ...processed, imagePath: data.imagePath };
          
          // Evitar duplicados basados en descripción e imagen nativa
          const exists = get().sharedContentList.some(item => 
            item.description === processedWithSource.description && 
            item.imagePath === processedWithSource.imagePath
          );
          
          if (!exists) {
            get().addSharedContent(processedWithSource);
          }
          await ShareReceiver.clearSharedData();
        }
      }).catch(err => console.error('Error fetching initial shared data:', err));

      // 3. Escuchar por compartidos recibidos en tiempo real (app abierta)
      ShareReceiver.addListener('onShareReceived', async (data: RawSharedData) => {
        if (data.text || data.imagePath) {
          const processed = await processSharedData(data);
          const processedWithSource = { ...processed, imagePath: data.imagePath };
          get().addSharedContent(processedWithSource);
          await ShareReceiver.clearSharedData();
        }
      });
    });
  }
}));
