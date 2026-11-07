import { supabase } from './supabase';

/**
 * Convierte un objeto File o Blob en una cadena Base64 limpia (sin el prefijo del tipo de contenido)
 */
export const fileToBase64 = (file: File | Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64String = reader.result as string;
      // El resultado viene como "data:image/jpeg;base64,....."
      // Necesitamos separar la parte base64 pura
      const parts = base64String.split(',');
      const cleanBase64 = parts.length > 1 ? parts[1] : parts[0];
      resolve(cleanBase64);
    };
    reader.onerror = (error) => {
      reject(error);
    };
    reader.readAsDataURL(file);
  });
};

export interface AIAnalysisResult {
  title: string;
  description: string;
  price?: number | null;
  currency?: 'USD' | 'CUP';
}

export interface AIAnalysisContext {
  name?: string | null;
  description?: string | null;
  price?: number | string | null;
  currency?: string | null;
}

/**
 * Invoca la Edge Function de Supabase para analizar la imagen de un producto de forma segura
 */
export const analyzeProductImage = async (
  file: File | Blob,
  context?: AIAnalysisContext
): Promise<AIAnalysisResult> => {
  try {
    const base64Image = await fileToBase64(file);
    const mimeType = file.type || 'image/jpeg';

    const { data, error } = await supabase.functions.invoke('analyze-image-gemini', {
      body: { 
        image: base64Image, 
        mimeType,
        productName: context?.name || '',
        productInfo: context?.description || '',
        price: context?.price || null,
        currency: context?.currency || 'USD',
      }
    });

    if (error) {
      console.error("Error al invocar analyze-image-gemini:", error);
      let errorMessage = 'Error al conectar con la Inteligencia Artificial.';
      
      if (error.context && typeof error.context.json === 'function') {
        try {
          const errorBody = await error.context.json();
          const serverMessage = errorBody.message || '';
          const serverError = errorBody.error || '';
          errorMessage = serverError ? `[${serverError}] ${serverMessage}` : serverMessage || errorMessage;
        } catch (e) {
          // Si no se puede parsear JSON, usar el fallback
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      throw new Error(errorMessage);
    }

    if (!data || !data.title) {
      throw new Error('La IA no devolvió el formato esperado.');
    }

    return {
      title: data.title,
      description: data.description,
      price: data.price,
      currency: data.currency
    };
  } catch (err: any) {
    console.error("Error en analyzeProductImage:", err);
    throw err;
  }
};

/**
 * Realiza un test de conexión ultra liviano con la Edge Function para validar la clave API y modelo seleccionados
 */
export const validateGeminiConfiguration = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    const { data, error } = await supabase.functions.invoke('analyze-image-gemini', {
      body: { 
        testConnection: true
      }
    });

    if (error) {
      console.error("Error al invocar analyze-image-gemini (test):", error);
      let errorMessage = 'Error al conectar con la Inteligencia Artificial.';
      
      if (error.context && typeof error.context.json === 'function') {
        try {
          const errorBody = await error.context.json();
          errorMessage = errorBody.message || errorBody.error || errorMessage;
        } catch (e) {}
      } else if (error.message) {
        errorMessage = error.message;
      }
      return { success: false, error: errorMessage };
    }

    return { success: !!data?.success };
  } catch (err: any) {
    console.error("Error en validateGeminiConfiguration:", err);
    return { success: false, error: err.message || 'Error de red' };
  }
};
