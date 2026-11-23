import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProductCollapsibleDetails } from '../ProductCollapsibleDetails';

describe('ProductCollapsibleDetails', () => {
  it('renderiza las 3 secciones cuando se proporcionan explícitamente', async () => {
    const user = userEvent.setup();

    render(
      <ProductCollapsibleDetails
        description="Smartwatch de alta gama resistente al agua."
        detailsAndDimensions="• Pantalla: 1.4 pulgadas AMOLED\n• Batería: 300mAh\n• Resistencia: 5 ATM"
        careAndMaintenance="• No sumergir en agua caliente\n• Limpiar con paño suave"
        defaultOpen={{ description: true, details: false, care: false }}
      />
    );

    // Verificar que los encabezados colapsables están presentes
    expect(screen.getByRole('button', { name: /descripción/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /detalles y dimensiones/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cuidado y mantenimiento/i })).toBeInTheDocument();

    // La descripción está abierta por defecto
    expect(screen.getByText('Smartwatch de alta gama resistente al agua.')).toBeInTheDocument();

    // Detalles está cerrado inicialmente
    expect(screen.queryByText(/Pantalla: 1.4 pulgadas/i)).not.toBeInTheDocument();

    // Al hacer clic en "Detalles y dimensiones", se abre
    await user.click(screen.getByRole('button', { name: /detalles y dimensiones/i }));
    expect(screen.getByText(/Pantalla: 1.4 pulgadas/i)).toBeInTheDocument();

    // Al hacer clic en "Cuidado y mantenimiento", se abre
    await user.click(screen.getByRole('button', { name: /cuidado y mantenimiento/i }));
    expect(screen.getByText(/No sumergir en agua caliente/i)).toBeInTheDocument();
  });

  it('extrae inteligentemente especificaciones y cuidados si vienen en el texto de la descripción', async () => {
    const user = userEvent.setup();

    const rawDescription = `Reloj deportivo de última generación.

ESPECIFICACIONES TÉCNICAS:
• Dimensiones: 45 x 38 mm
• Peso: 45g
• Conectividad: Bluetooth 5.3

CUIDADO Y MANTENIMIENTO:
• Evitar caídas y golpes fuertes
• Secar bien después de entrenar`;

    render(
      <ProductCollapsibleDetails
        description={rawDescription}
        defaultOpen={{ description: true, details: false, care: false }}
      />
    );

    // Debe haber extraído las 3 secciones
    expect(screen.getByRole('button', { name: /descripción/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /detalles y dimensiones/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cuidado y mantenimiento/i })).toBeInTheDocument();

    // Verificar texto limpio en descripción
    expect(screen.getByText('Reloj deportivo de última generación.')).toBeInTheDocument();

    // Abrir detalles
    await user.click(screen.getByRole('button', { name: /detalles y dimensiones/i }));
    expect(screen.getByText(/Dimensiones: 45 x 38 mm/i)).toBeInTheDocument();

    // Abrir cuidados
    await user.click(screen.getByRole('button', { name: /cuidado y mantenimiento/i }));
    expect(screen.getByText(/Evitar caídas y golpes fuertes/i)).toBeInTheDocument();
  });

  it('no renderiza nada si todos los campos son nulos o vacíos', () => {
    const { container } = render(
      <ProductCollapsibleDetails
        description={null}
        detailsAndDimensions={null}
        careAndMaintenance={null}
      />
    );

    expect(container.firstChild).toBeNull();
  });
});
