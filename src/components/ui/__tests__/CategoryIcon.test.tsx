import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';
import { CategoryIcon } from '../CategoryIcon';
import {
  CATEGORY_ICONS,
  POPULAR_CATEGORY_ICONS,
  CATEGORY_ICON_GROUPS,
  normalizeCategoryIconName
} from '../../../constants/categoryIcons';

describe('Category Icons System', () => {
  it('contiene una base sólida y categorizada con más de 80 iconos', () => {
    expect(CATEGORY_ICONS.length).toBeGreaterThan(80);
    expect(POPULAR_CATEGORY_ICONS.length).toBeGreaterThan(15);
    expect(CATEGORY_ICON_GROUPS.length).toBeGreaterThan(10);
  });

  it('normaliza términos reales analizados en MatumListener a sus iconos correspondientes', () => {
    // Energía
    expect(normalizeCategoryIconName('solar')).toBe('Sun');
    expect(normalizeCategoryIconName('paneles solares')).toBe('Sun');
    expect(normalizeCategoryIconName('inversor')).toBe('Zap');
    expect(normalizeCategoryIconName('bateria')).toBe('Battery');
    expect(normalizeCategoryIconName('ecoflow')).toBe('BatteryCharging');

    // Movilidad
    expect(normalizeCategoryIconName('bicicleta')).toBe('Bike');
    expect(normalizeCategoryIconName('bici')).toBe('Bike');
    expect(normalizeCategoryIconName('motorina')).toBe('Gauge');
    expect(normalizeCategoryIconName('moto')).toBe('Gauge');
    expect(normalizeCategoryIconName('triciclo')).toBe('Truck');

    // Clima & Frío
    expect(normalizeCategoryIconName('split')).toBe('AirVent');
    expect(normalizeCategoryIconName('aire acondicionado')).toBe('AirVent');
    expect(normalizeCategoryIconName('ventilador')).toBe('Wind');
    expect(normalizeCategoryIconName('refrigerador')).toBe('Refrigerator');
    expect(normalizeCategoryIconName('nevera')).toBe('Refrigerator');
    expect(normalizeCategoryIconName('congelador')).toBe('Snowflake');

    // Cocina & Electrodomésticos
    expect(normalizeCategoryIconName('olla reina')).toBe('CookingPot');
    expect(normalizeCategoryIconName('freidora de aire')).toBe('Soup');
    expect(normalizeCategoryIconName('fogon')).toBe('Flame');
    expect(normalizeCategoryIconName('lavadora')).toBe('WashingMachine');

    // Audio & TV
    expect(normalizeCategoryIconName('smart tv')).toBe('Tv');
    expect(normalizeCategoryIconName('televisor')).toBe('Tv');
    expect(normalizeCategoryIconName('bocina')).toBe('Speaker');
    expect(normalizeCategoryIconName('cajita')).toBe('Radio');

    // Comercio & Finanzas
    expect(normalizeCategoryIconName('contadora')).toBe('CircleDollarSign');
    expect(normalizeCategoryIconName('dinero')).toBe('CircleDollarSign');
    expect(normalizeCategoryIconName('pesa')).toBe('Scale');

    // Muebles & Hogar
    expect(normalizeCategoryIconName('colchon')).toBe('BedDouble');
    expect(normalizeCategoryIconName('cama')).toBe('BedDouble');
    expect(normalizeCategoryIconName('sofa')).toBe('Sofa');
    expect(normalizeCategoryIconName('bano')).toBe('Bath');
  });

  it('mantiene compatibilidad retroactiva con nombres en minúsculas y viejos', () => {
    expect(normalizeCategoryIconName('shirt')).toBe('Shirt');
    expect(normalizeCategoryIconName('pizza')).toBe('Pizza');
    expect(normalizeCategoryIconName('wrench')).toBe('Wrench');
    expect(normalizeCategoryIconName('fastfood')).toBe('Pizza');
    expect(normalizeCategoryIconName('phoneportrait')).toBe('Smartphone');
    expect(normalizeCategoryIconName(null)).toBe('Folder');
    expect(normalizeCategoryIconName('')).toBe('Folder');
  });

  it('renderiza CategoryIcon sin crashear para iconos clave', () => {
    const { container } = render(
      <div>
        <CategoryIcon name="Sun" />
        <CategoryIcon name="Bike" />
        <CategoryIcon name="AirVent" />
        <CategoryIcon name="Refrigerator" />
        <CategoryIcon name="CookingPot" />
        <CategoryIcon name="Tv" />
        <CategoryIcon name="WashingMachine" />
        <CategoryIcon name="CircleDollarSign" />
      </div>
    );
    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBe(8);
  });
});
