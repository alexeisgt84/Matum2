import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProductFormModal } from '../ProductFormModal';
import type { Product } from '../../../types/product';

let mockProfile: { id: string; plan: string; gemini_api_key: string | null } | null = {
  id: 'user-1',
  plan: 'free',
  gemini_api_key: null,
};

vi.mock('heic2any', () => ({
  default: vi.fn(),
}));

vi.mock('@capacitor/camera', () => ({
  Camera: { getPhoto: vi.fn() },
  CameraResultType: { Uri: 'uri' },
  CameraSource: { Prompt: 'prompt' },
}));

vi.mock('../../../hooks/useProfile', () => ({
  useProfile: () => ({
    profile: mockProfile,
  }),
}));

vi.mock('../../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    storage: { from: vi.fn() },
    auth: { getSession: vi.fn() },
  },
}));

vi.mock('react-hot-toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
  },
}));

const sampleProduct: Product = {
  id: 'prod-1',
  catalog_id: 'cat-1',
  name: 'Camisa de Lino',
  description: 'Camisa fresca',
  price: 25,
  currency: 'USD',
  imagen_url: 'https://example.com/shirt.jpg',
  position: 0,
  is_active: true,
  is_featured: false,
  badges: [],
  is_out_of_stock: false,
  stock_status: 'available',
  created_at: '2026-11-17T00:00:00Z',
  nemu_product_id: null,
};

describe('ProductFormModal - botón Aceptar y enviar según plan', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockProfile = {
      id: 'user-1',
      plan: 'free',
      gemini_api_key: null,
    };
  });

  it.each([
    { label: 'plan free', profile: { id: 'user-1', plan: 'free', gemini_api_key: null } },
    { label: 'plan basic', profile: { id: 'user-1', plan: 'basic', gemini_api_key: null } },
    { label: 'plan pro', profile: { id: 'user-1', plan: 'pro', gemini_api_key: null } },
    { label: 'perfil null', profile: null },
  ])('oculta "Aceptar y enviar" y muestra "Aceptar" como primario al crear producto con $label', async ({ profile }) => {
    mockProfile = profile;
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(true);
    const onClose = vi.fn();

    render(
      <ProductFormModal
        isOpen={true}
        onClose={onClose}
        onSave={onSave}
        product={null}
      />
    );

    expect(screen.queryByRole('button', { name: /Aceptar y enviar/i })).not.toBeInTheDocument();

    const acceptButton = screen.getByRole('button', { name: /^Aceptar$/i });
    expect(acceptButton).toBeInTheDocument();
    expect(acceptButton).toHaveClass('bg-accent');

    await user.click(acceptButton);

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith(expect.any(Object), undefined, undefined, false);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('muestra "Aceptar" (secundario) y "Aceptar y enviar" (primario) al crear producto con plan premium', async () => {
    mockProfile = {
      id: 'user-1',
      plan: 'premium',
      gemini_api_key: null,
    };
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(true);
    const onClose = vi.fn();

    render(
      <ProductFormModal
        isOpen={true}
        onClose={onClose}
        onSave={onSave}
        product={null}
      />
    );

    const acceptButton = screen.getByRole('button', { name: /^Aceptar$/i });
    const acceptAndSendButton = screen.getByRole('button', { name: /Aceptar y enviar/i });

    expect(acceptButton).toHaveClass('bg-surface-hover');
    expect(acceptAndSendButton).toHaveClass('bg-accent');

    await user.click(acceptAndSendButton);
    expect(onSave).toHaveBeenNthCalledWith(1, expect.any(Object), undefined, undefined, true);
    expect(onClose).toHaveBeenCalledTimes(1);

    await user.click(acceptButton);
    expect(onSave).toHaveBeenNthCalledWith(2, expect.any(Object), undefined, undefined, false);
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('al editar un producto existente siendo usuario premium muestra "Guardar Cambios" como primario y oculta "Aceptar y enviar"', () => {
    mockProfile = {
      id: 'user-1',
      plan: 'premium',
      gemini_api_key: null,
    };
    const onSave = vi.fn().mockResolvedValue(true);

    render(
      <ProductFormModal
        isOpen={true}
        onClose={vi.fn()}
        onSave={onSave}
        product={sampleProduct}
      />
    );

    const saveChangesButton = screen.getByRole('button', { name: /Guardar Cambios/i });
    expect(saveChangesButton).toBeInTheDocument();
    expect(saveChangesButton).toHaveClass('bg-accent');
    expect(screen.queryByRole('button', { name: /Aceptar y enviar/i })).not.toBeInTheDocument();
  });
});
