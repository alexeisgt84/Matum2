import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '../Button';

describe('Button component', () => {
  it('debe renderizar el texto del botón correctamente', () => {
    render(<Button>Guardar Producto</Button>);
    expect(screen.getByRole('button', { name: /Guardar Producto/i })).toBeInTheDocument();
  });

  it('debe ejecutar el callback onClick cuando se presiona', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Enviar</Button>);

    fireEvent.click(screen.getByRole('button', { name: /Enviar/i }));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('debe estar deshabilitado y no ejecutar click si disabled es true', () => {
    const handleClick = vi.fn();
    render(<Button disabled onClick={handleClick}>Deshabilitado</Button>);

    const button = screen.getByRole('button', { name: /Deshabilitado/i });
    expect(button).toBeDisabled();

    fireEvent.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('debe mostrar spinner de carga y deshabilitarse cuando loading es true', () => {
    render(<Button loading>Procesando</Button>);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(screen.queryByText(/Procesando/i)).not.toBeInTheDocument();
  });
});
