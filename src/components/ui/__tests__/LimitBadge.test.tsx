import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LimitBadge } from '../LimitBadge';

describe('LimitBadge component', () => {
  it('debe mostrar la etiqueta y el conteo actual vs límite', () => {
    render(<LimitBadge label="Catálogos" current={1} limit={3} />);

    expect(screen.getByText('Catálogos')).toBeInTheDocument();
    expect(screen.getByText(/1/)).toBeInTheDocument();
    expect(screen.getByText(/\/ 3/)).toBeInTheDocument();
  });

  it('debe aplicar estilos de peligro si se alcanza el 90% o más del límite', () => {
    const { container } = render(<LimitBadge label="Productos" current={8} limit={8} />);

    const badgeText = container.querySelector('.tabular-nums');
    expect(badgeText).toHaveClass('text-danger');

    const progressBar = container.querySelector('.bg-danger');
    expect(progressBar).toBeInTheDocument();
  });

  it('debe aplicar estilo normal (bg-accent) si está por debajo del 90%', () => {
    const { container } = render(<LimitBadge label="Productos" current={2} limit={10} />);

    const progressBar = container.querySelector('.bg-accent');
    expect(progressBar).toBeInTheDocument();
  });
});
