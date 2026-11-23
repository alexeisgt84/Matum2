import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Capacitor } from '@capacitor/core';
import { Camera as CapCamera, CameraSource } from '@capacitor/camera';
import { ImageUpload } from '../ImageUpload';

// Mock Capacitor Core
vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: vi.fn().mockReturnValue(false),
  },
}));

// Mock Capacitor Camera
vi.mock('@capacitor/camera', () => ({
  Camera: {
    getPhoto: vi.fn(),
  },
  CameraResultType: { Uri: 'uri' },
  CameraSource: { Prompt: 'prompt', Camera: 'camera' },
}));

// Mock heic2any
vi.mock('heic2any', () => ({
  default: vi.fn(),
}));

describe('ImageUpload component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
  });

  it('renderiza la etiqueta predeterminada cuando no hay imagen', () => {
    render(<ImageUpload onChange={vi.fn()} label="Añadir Foto" />);
    expect(screen.getByText('Añadir Foto')).toBeInTheDocument();
  });

  it('muestra la imagen y el botón de Studio de Imagen cuando hay una imagen cargada', () => {
    render(
      <ImageUpload
        value="https://example.com/test.jpg"
        onChange={vi.fn()}
      />
    );

    const img = screen.getByRole('img', { name: /preview/i });
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://example.com/test.jpg');
    expect(screen.getByText(/Studio de Imagen/i)).toBeInTheDocument();
  });

  it('ejecuta onRemove al hacer clic en el botón de eliminar foto', () => {
    const handleRemove = vi.fn();
    render(
      <ImageUpload
        value="https://example.com/test.jpg"
        onChange={vi.fn()}
        onRemove={handleRemove}
      />
    );

    const removeBtn = screen.getByTitle('Quitar foto');
    expect(removeBtn).toBeInTheDocument();

    fireEvent.click(removeBtn);
    expect(handleRemove).toHaveBeenCalledTimes(1);
  });

  it('renderiza extraActions y bottomContent correctamente', () => {
    render(
      <ImageUpload
        value="https://example.com/test.jpg"
        onChange={vi.fn()}
        extraActions={<button>Acción IA</button>}
        bottomContent={<span>Texto de ayuda</span>}
      />
    );

    expect(screen.getByText('Acción IA')).toBeInTheDocument();
    expect(screen.getByText('Texto de ayuda')).toBeInTheDocument();
  });

  it('renderiza el botón de Tomar foto y abre la cámara web cuando getUserMedia está disponible', async () => {
    const mockStop = vi.fn();
    const mockGetUserMedia = vi.fn().mockResolvedValue({
      getTracks: () => [{ stop: mockStop }],
    });

    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: mockGetUserMedia },
    });

    render(<ImageUpload onChange={vi.fn()} />);

    const cameraBtn = screen.getByRole('button', { name: /Tomar foto/i });
    expect(cameraBtn).toBeInTheDocument();

    fireEvent.click(cameraBtn);

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: /Tomar foto con cámara/i })).toBeInTheDocument();
    });
    expect(mockGetUserMedia).toHaveBeenCalledWith({
      video: { facingMode: { ideal: 'environment' } },
      audio: false,
    });

    fireEvent.click(screen.getByRole('button', { name: /Cerrar cámara/i }));
    expect(mockStop).toHaveBeenCalled();
  });

  it('usa Capacitor Camera con CameraSource.Camera en plataforma nativa al pulsar Tomar foto', async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    vi.mocked(CapCamera.getPhoto).mockResolvedValue({
      format: 'jpeg',
      saved: false,
    });

    render(<ImageUpload onChange={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /Tomar foto/i }));

    await waitFor(() => {
      expect(CapCamera.getPhoto).toHaveBeenCalledWith(
        expect.objectContaining({
          source: CameraSource.Camera,
        })
      );
    });
  });
});
