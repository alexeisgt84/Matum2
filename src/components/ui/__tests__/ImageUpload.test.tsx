import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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
  CameraSource: { Prompt: 'prompt' },
}));

// Mock heic2any
vi.mock('heic2any', () => ({
  default: vi.fn(),
}));

describe('ImageUpload component', () => {
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
});
