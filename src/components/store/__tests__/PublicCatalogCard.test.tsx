import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PublicCatalogCard } from '../PublicCatalogCard';
import type { PublicCatalogItem } from '../../../hooks/usePublicCatalogs';

vi.mock('../../../store/authStore', () => ({
  useAuthStore: () => ({
    user: { id: 'user-1', role: 'user' },
  }),
}));

const baseCatalog: PublicCatalogItem = {
  id: 'cat-1',
  user_id: 'user-1',
  name: 'Tienda Minimal',
  slug: 'tienda-minimal',
  slogan: 'Todo en un solo lugar',
  description: null,
  logo_url: null,
  cover_url: null,
  primary_color: '#18181b',
  background_color: '#fafaf9',
  surface_color: '#ffffff',
  text_color: '#18181b',
  title_color: '#000000',
  enable_affiliates: false,
  catalog_type: 'standard',
  is_active: true,
  is_public: true,
  created_at: '2026-01-01T00:00:00Z',
  productCount: 5,
};

describe('PublicCatalogCard', () => {
  it('usa el color de texto del tema de la app (text-primary) y no fuerza title_color oscuro sobre la tarjeta', () => {
    render(
      <MemoryRouter>
        <PublicCatalogCard catalog={baseCatalog} isOwner />
      </MemoryRouter>
    );

    const heading = screen.getByRole('heading', { level: 3, name: 'Tienda Minimal' });
    expect(heading).toHaveClass('text-primary');
    expect(heading.style.color).toBe('');
  });
});
