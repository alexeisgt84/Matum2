import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AnimatedLogo, LoadingScreen } from '../AnimatedLogo';

describe('AnimatedLogo', () => {
  it('renderiza la imagen oficial del logo con clases de animación', () => {
    const { container } = render(<AnimatedLogo size="md" />);
    const img = container.querySelector('img[src="/icon.png"]');
    expect(img).toBeInTheDocument();
    expect(img).toHaveClass('nazaar-logo-float');
    expect(container.querySelector('.nazaar-logo-ring')).toBeInTheDocument();
    expect(container.querySelector('.nazaar-logo-halo')).toBeInTheDocument();
  });
});

describe('LoadingScreen', () => {
  it('muestra el logo animado con rol status y etiqueta opcional', () => {
    render(<LoadingScreen label="Cargando tienda…" />);
    const status = screen.getByRole('status', { name: 'Cargando tienda…' });
    expect(status).toBeInTheDocument();
    expect(screen.getByText('Cargando tienda…')).toBeInTheDocument();
  });

  it('usa texto accesible por defecto cuando no se pasa label', () => {
    render(<LoadingScreen fullScreen={false} />);
    expect(screen.getByRole('status', { name: 'Cargando' })).toBeInTheDocument();
    expect(screen.getByText('Cargando…')).toHaveClass('sr-only');
  });
});
