import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Input } from '../Input';

describe('Input component', () => {
  it('debe renderizar label, placeholder y responder al cambio de texto', () => {
    const handleChange = vi.fn();
    render(
      <Input
        label="Nombre del Producto"
        placeholder="Ej: Camiseta de algodón"
        onChange={handleChange}
      />
    );

    expect(screen.getByText('Nombre del Producto')).toBeInTheDocument();
    const input = screen.getByPlaceholderText('Ej: Camiseta de algodón');
    expect(input).toBeInTheDocument();

    fireEvent.change(input, { target: { value: 'Nuevo título' } });
    expect(handleChange).toHaveBeenCalledTimes(1);
  });

  it('debe mostrar mensaje de error cuando se pasa la prop error', () => {
    render(<Input label="Precio" error="El precio es obligatorio" />);
    expect(screen.getByText('El precio es obligatorio')).toBeInTheDocument();
  });

  it('debe alternar visibilidad de contraseña con el botón de toggle', () => {
    render(<Input type="password" placeholder="Contraseña" showPasswordToggle />);
    const input = screen.getByPlaceholderText('Contraseña') as HTMLInputElement;

    expect(input.type).toBe('password');

    // Botón de toggle
    const toggleBtn = screen.getByRole('button');
    fireEvent.click(toggleBtn);
    expect(input.type).toBe('text');

    fireEvent.click(toggleBtn);
    expect(input.type).toBe('password');
  });

  it('debe renderizar como textarea si multiline es true', () => {
    render(<Input multiline placeholder="Descripción detallada" />);
    const textarea = screen.getByPlaceholderText('Descripción detallada');
    expect(textarea.tagName.toLowerCase()).toBe('textarea');
  });
});
