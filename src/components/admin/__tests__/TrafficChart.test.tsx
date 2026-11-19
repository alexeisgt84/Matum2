import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TrafficChart } from '../TrafficChart';
import type { TrafficTimeSeries } from '../../../lib/analytics';

const mockSeries: TrafficTimeSeries = {
  byDay: [
    {
      key: '2026-11-18',
      label: '18 nov',
      fullLabel: 'Miércoles 18 de noviembre, 2026',
      storeViews: 4,
      productViews: 6,
      referralViews: 2,
      totalViews: 10,
    },
    {
      key: '2026-11-19',
      label: '19 nov',
      fullLabel: 'Jueves 19 de noviembre, 2026',
      storeViews: 8,
      productViews: 12,
      referralViews: 5,
      totalViews: 20,
    },
  ],
  byWeek: [
    {
      key: '2026-11-16',
      label: '16 nov',
      fullLabel: 'Semana del 16 de nov, 2026',
      storeViews: 12,
      productViews: 18,
      referralViews: 7,
      totalViews: 30,
    },
  ],
  byMonth: [
    {
      key: '2026-11',
      label: 'Nov 26',
      fullLabel: 'Noviembre 2026',
      storeViews: 25,
      productViews: 40,
      referralViews: 12,
      totalViews: 65,
    },
  ],
};

describe('TrafficChart', () => {
  it('renders empty state when timeSeries has no points', () => {
    render(<TrafficChart timeSeries={{ byDay: [], byWeek: [], byMonth: [] }} />);
    expect(screen.getByText(/Sin eventos temporales para graficar/i)).toBeInTheDocument();
  });

  it('switches between days, weeks, and months granularities', () => {
    render(<TrafficChart timeSeries={mockSeries} />);

    // Por defecto muestra Días
    expect(screen.getByText('18 nov')).toBeInTheDocument();
    expect(screen.getByText('Jueves 19 de noviembre, 2026:')).toBeInTheDocument();

    // Cambiar a Semanas
    fireEvent.click(screen.getByRole('tab', { name: /Semanas/i }));
    expect(screen.getByText('16 nov')).toBeInTheDocument();
    expect(screen.getByText('Semana del 16 de nov, 2026:')).toBeInTheDocument();

    // Cambiar a Meses
    fireEvent.click(screen.getByRole('tab', { name: /Meses/i }));
    expect(screen.getByText('Nov 26')).toBeInTheDocument();
    expect(screen.getByText('Noviembre 2026:')).toBeInTheDocument();
  });
});
