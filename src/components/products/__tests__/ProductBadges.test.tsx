import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProductBadgesOverlay, ProductBadgesInline } from '../ProductBadges';
import { ProductCard as StoreProductCard } from '../../store/ProductCard';
import { ProductFormModal } from '../ProductFormModal';
import type { PublicProduct } from '../../../types/store';
import type { Product } from '../../../types/product';

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
    profile: { id: 'user-1', plan: 'free', gemini_api_key: null },
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

const basePublicProduct: PublicProduct = {
  id: 'prod-1',
  catalog_id: 'cat-1',
  name: 'Camisa de Lino',
  description: 'Camisa fresca',
  price: 25,
  currency: 'USD',
  imagen_url: 'https://example.com/shirt.jpg',
  is_out_of_stock: false,
  is_featured: false,
  badges: [],
  stock_status: 'available',
};

const baseAdminProduct: Product = {
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
  badges: ['on_sale'],
  is_out_of_stock: false,
  stock_status: 'available',
  created_at: '2026-11-17T00:00:00Z',
  nemu_product_id: null,
};

describe('ProductBadges components', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('no renderiza ningún contenedor vacío cuando el producto no tiene etiquetas', () => {
    const { container } = render(<ProductBadgesOverlay badges={[]} isFeatured={false} />);
    expect(container).toBeEmptyDOMElement();

    const inline = render(<ProductBadgesInline badges={[]} isFeatured={false} />);
    expect(inline.container).toBeEmptyDOMElement();
  });

  it('muestra múltiples etiquetas apiladas en la esquina superior derecha sobresaliendo con pliegue trasero y sin emojis', () => {
    render(<ProductBadgesOverlay badges={['low_stock', 'on_sale', 'new']} />);
    const overlay = screen.getByTestId('product-badges-overlay');
    expect(overlay).toHaveClass('top-2', '-right-1.5', 'flex-col', 'items-end', 'pointer-events-none');

    const items = overlay.querySelectorAll('[data-badge-id]');
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveAttribute('data-badge-id', 'on_sale');
    expect(items[1]).toHaveAttribute('data-badge-id', 'new');
    expect(items[2]).toHaveAttribute('data-badge-id', 'low_stock');
    expect(items[0].textContent).toBe('EN OFERTA');
    expect(items[1].textContent).toBe('NUEVO');
    expect(items[2].textContent).toBe('ÚLTIMAS UNIDADES');
  });

  it('integra las etiquetas en la tarjeta de tienda sin interferir con el botón compartir ni mostrar contenedores vacíos', () => {
    const { rerender } = render(
      <StoreProductCard
        product={basePublicProduct}
        quantity={0}
        price={{ main: '25 USD' }}
        onOpen={vi.fn()}
        onAdd={vi.fn()}
        onRemove={vi.fn()}
        onShare={vi.fn()}
      />
    );

    expect(screen.queryByTestId('product-badges-overlay')).not.toBeInTheDocument();

    rerender(
      <StoreProductCard
        product={{ ...basePublicProduct, badges: ['discount', 'featured'], is_featured: true }}
        quantity={0}
        price={{ main: '25 USD' }}
        onOpen={vi.fn()}
        onAdd={vi.fn()}
        onRemove={vi.fn()}
        onShare={vi.fn()}
      />
    );

    const overlay = screen.getByTestId('product-badges-overlay');
    expect(overlay).toHaveClass('top-2', '-right-1.5');
    expect(within(overlay).getByText('EN REBAJA')).toBeInTheDocument();
    expect(within(overlay).getByText('DESTACADO')).toBeInTheDocument();

    const shareButton = screen.getByRole('button', { name: /Compartir Camisa de Lino/i });
    expect(shareButton).toHaveClass('bottom-1.5', 'right-1.5');
  });

  it('permite activar/desactivar etiquetas, ver vista previa y guardar etiquetas sin modificar otros datos', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(true);
    const onSaveBadges = vi.fn().mockResolvedValue(true);

    render(
      <ProductFormModal
        isOpen={true}
        onClose={vi.fn()}
        onSave={onSave}
        onSaveBadges={onSaveBadges}
        product={baseAdminProduct}
      />
    );

    const badgesSection = screen.getByRole('region', { name: /Etiquetas del producto/i });
    expect(badgesSection).toBeInTheDocument();

    const previewCard = screen.getByTestId('product-badges-preview-card');
    expect(within(previewCard).getByText('EN OFERTA')).toBeInTheDocument();

    const newBadgeBtn = within(badgesSection).getByRole('button', { name: /NUEVO/i });
    const featuredBadgeBtn = within(badgesSection).getByRole('button', { name: /DESTACADO/i });

    await user.click(newBadgeBtn);
    await user.click(featuredBadgeBtn);

    expect(within(previewCard).getByText('NUEVO')).toBeInTheDocument();
    expect(within(previewCard).getByText('DESTACADO')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Quitar de destacados/i })).toBeInTheDocument();

    const saveBadgesBtn = within(badgesSection).getByRole('button', { name: /Guardar etiquetas/i });
    await user.click(saveBadgesBtn);

    expect(onSaveBadges).toHaveBeenCalledWith(baseAdminProduct, ['on_sale', 'new', 'featured']);
    expect(onSave).not.toHaveBeenCalled();
  });
});
