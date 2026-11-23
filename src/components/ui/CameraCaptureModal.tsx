import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Camera, RefreshCw, X, Upload } from 'lucide-react';

interface CameraCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (blob: Blob) => void;
  onFallbackToFile?: () => void;
}

export const CameraCaptureModal: React.FC<CameraCaptureModalProps> = ({
  isOpen,
  onClose,
  onCapture,
  onFallbackToFile,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const startCamera = useCallback(async (mode: 'environment' | 'user') => {
    stopStream();
    setIsLoading(true);
    setError(null);

    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Tu navegador no soporta acceso directo a la cámara.');
      setIsLoading(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: mode } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      const name = err?.name || '';
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        setError('Permiso de cámara denegado. Habilítalo en tu navegador para tomar fotos.');
      } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        setError('No se encontró ninguna cámara conectada en este dispositivo.');
      } else {
        setError('No se pudo iniciar la cámara. Intenta subir una imagen desde tus archivos.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [stopStream]);

  useEffect(() => {
    if (!isOpen) {
      stopStream();
      return;
    }
    startCamera(facingMode);
    return () => {
      stopStream();
    };
  }, [isOpen, facingMode, startCamera, stopStream]);

  if (!isOpen) return null;

  const handleCapture = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (blob) {
          stopStream();
          onCapture(blob);
        }
      },
      'image/jpeg',
      0.92
    );
  };

  const handleToggleFacing = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Tomar foto con cámara"
    >
      <div className="w-full max-w-md bg-surface border border-border rounded-2xl overflow-hidden shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2 text-sm font-bold text-primary">
            <Camera size={16} className="text-[var(--accent)]" />
            <span>Tomar foto</span>
          </div>
          <button
            type="button"
            onClick={() => {
              stopStream();
              onClose();
            }}
            className="p-1.5 rounded-lg text-secondary hover:text-primary hover:bg-surface-hover transition-colors"
            aria-label="Cerrar cámara"
          >
            <X size={18} />
          </button>
        </div>

        <div className="relative bg-black aspect-[4/3] w-full flex items-center justify-center overflow-hidden">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover ${error ? 'hidden' : 'block'}`}
          />

          {isLoading && !error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/60 text-white text-xs">
              <div className="w-8 h-8 border-4 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
              <span>Iniciando cámara...</span>
            </div>
          )}

          {error && (
            <div className="p-6 text-center space-y-3">
              <p className="text-xs text-red-400 font-medium">{error}</p>
              {onFallbackToFile && (
                <button
                  type="button"
                  onClick={() => {
                    stopStream();
                    onClose();
                    onFallbackToFile();
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-surface-hover border border-border text-primary hover:border-[var(--accent)]/50 transition-all"
                >
                  <Upload size={14} />
                  <span>Elegir archivo</span>
                </button>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-surface">
          <button
            type="button"
            onClick={handleToggleFacing}
            disabled={isLoading || !!error}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-surface-hover border border-border text-secondary hover:text-primary disabled:opacity-40 transition-all"
            title="Cambiar cámara"
          >
            <RefreshCw size={14} />
            <span>Cambiar</span>
          </button>

          <button
            type="button"
            onClick={handleCapture}
            disabled={isLoading || !!error}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-[var(--accent)] text-white hover:opacity-90 active:scale-95 disabled:opacity-40 transition-all shadow-lg"
          >
            <Camera size={15} />
            <span>Capturar</span>
          </button>
        </div>
      </div>
    </div>
  );
};
