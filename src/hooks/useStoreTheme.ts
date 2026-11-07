import { useEffect, useMemo } from 'react';
import type React from 'react';

// Sistema de tema de las tiendas públicas:
// - Calcula una sola vez los tokens CSS a partir de los colores del catálogo
// - Incluye 6 temas predefinidos curados
// - Incluye cálculo de contraste relativo según WCAG 2.2

export interface ThemeSource {
  primary_color?: string | null;
  background_color?: string | null;
  surface_color?: string | null;
  text_color?: string | null;
  title_color?: string | null;
}

export interface StoreThemePreset {
  id: string;
  name: string;
  subtitle: string;
  colors: {
    primary_color: string;
    background_color: string;
    surface_color: string;
    title_color: string;
    text_color: string;
  };
}

export const STORE_THEME_PRESETS: StoreThemePreset[] = [
  {
    id: 'minimal',
    name: 'Minimal',
    subtitle: 'Claro y limpio',
    colors: {
      primary_color: '#18181b',
      background_color: '#fafaf9',
      surface_color: '#ffffff',
      title_color: '#09090b',
      text_color: '#18181b',
    },
  },
  {
    id: 'noir',
    name: 'Noir',
    subtitle: 'Oscuro Matum',
    colors: {
      primary_color: '#ff782e',
      background_color: '#0a0a0a',
      surface_color: '#1a1a1a',
      title_color: '#ffffff',
      text_color: '#ffffff',
    },
  },
  {
    id: 'boutique',
    name: 'Boutique',
    subtitle: 'Cálido y editorial',
    colors: {
      primary_color: '#8b5e3c',
      background_color: '#f5efe6',
      surface_color: '#fffdf9',
      title_color: '#2c1e14',
      text_color: '#3b2a1d',
    },
  },
  {
    id: 'fresh',
    name: 'Fresh',
    subtitle: 'Mercado y natural',
    colors: {
      primary_color: '#16a34a',
      background_color: '#f8faf8',
      surface_color: '#ffffff',
      title_color: '#052e16',
      text_color: '#14532d',
    },
  },
  {
    id: 'pop',
    name: 'Coral',
    subtitle: 'Vibrante y cercano',
    colors: {
      primary_color: '#f97316',
      background_color: '#fff7ed',
      surface_color: '#ffffff',
      title_color: '#431407',
      text_color: '#292524',
    },
  },
  {
    id: 'tech',
    name: 'Tech',
    subtitle: 'Azul nocturno',
    colors: {
      primary_color: '#38bdf8',
      background_color: '#0f172a',
      surface_color: '#1e293b',
      title_color: '#f8fafc',
      text_color: '#e2e8f0',
    },
  },
];

export const DEFAULT_STORE_COLORS = {
  primary: '#ff782e',
  background: '#0a0a0a',
  surface: '#1a1a1a',
} as const;

const HEX6 = /^#[0-9A-F]{6}$/i;

const parseRgb = (hexColor: string | null | undefined): [number, number, number] | null => {
  if (!hexColor || !HEX6.test(hexColor)) return null;
  return [
    parseInt(hexColor.slice(1, 3), 16),
    parseInt(hexColor.slice(3, 5), 16),
    parseInt(hexColor.slice(5, 7), 16),
  ];
};

/** Devuelve un color de texto legible (#121212 o #ffffff) sobre el color dado (YIQ). */
export const getContrastColor = (hexColor: string | null | undefined) => {
  const rgb = parseRgb(hexColor);
  if (!rgb) return '#ffffff';
  const [r, g, b] = rgb;
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 128 ? '#121212' : '#ffffff';
};

/** Luminancia relativa sRGB según WCAG 2.2. */
const relativeLuminance = ([r, g, b]: [number, number, number]) => {
  const channel = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
};

/** Ratio de contraste WCAG entre dos colores hexadecimales (1 a 21). */
export const getContrastRatio = (
  fgHex: string | null | undefined,
  bgHex: string | null | undefined
): number => {
  const fg = parseRgb(fgHex);
  const bg = parseRgb(bgHex);
  if (!fg || !bg) return 21;
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
};

export interface ContrastWarning {
  field: 'text_color' | 'title_color';
  label: string;
  ratio: number;
  suggestedColor: string;
}

/** Comprueba si el texto y el título cumplen el contraste mínimo WCAG AA (4.5:1 para texto, 3:1 para títulos). */
export const checkThemeContrast = (theme: ThemeSource): ContrastWarning[] => {
  const bg = theme.background_color || DEFAULT_STORE_COLORS.background;
  const text = theme.text_color || getContrastColor(bg);
  const title = theme.title_color || text;
  const warnings: ContrastWarning[] = [];

  const textRatio = getContrastRatio(text, bg);
  if (textRatio < 4.5) {
    warnings.push({
      field: 'text_color',
      label: 'El color de texto tiene poco contraste con el fondo',
      ratio: Number(textRatio.toFixed(1)),
      suggestedColor: getContrastColor(bg),
    });
  }

  const titleRatio = getContrastRatio(title, bg);
  if (titleRatio < 3) {
    warnings.push({
      field: 'title_color',
      label: 'El título se lee con dificultad sobre el fondo',
      ratio: Number(titleRatio.toFixed(1)),
      suggestedColor: getContrastColor(bg),
    });
  }

  return warnings;
};

const mix = (color: string, percent: number, base: string) =>
  `color-mix(in srgb, ${color} ${percent}%, ${base})`;

export const computeStoreTheme = (catalog: ThemeSource) => {
  const accent = catalog.primary_color || DEFAULT_STORE_COLORS.primary;
  const background = catalog.background_color || DEFAULT_STORE_COLORS.background;
  const surface = catalog.surface_color || DEFAULT_STORE_COLORS.surface;
  const textPrimary = catalog.text_color || getContrastColor(background);
  const titleColor = catalog.title_color || textPrimary;

  return {
    '--background': background,
    '--surface': surface,
    '--surface-hover': mix(textPrimary, 6, surface),
    '--border': mix(textPrimary, 11, background),
    '--title-color': titleColor,
    '--text-primary': textPrimary,
    '--text-secondary': mix(textPrimary, 64, background),
    '--accent': accent,
    '--accent-hover': mix(accent, 85, '#000000'),
    '--accent-text': getContrastColor(accent),
    '--accent-soft': mix(accent, 14, background),
  } as Record<string, string>;
};

interface UseStoreThemeOptions {
  /**
   * Si es true, también se aplica el tema sobre :root para que los elementos
   * renderizados fuera del contenedor (toasts, portales) hereden los colores.
   */
  applyToRoot?: boolean;
  styleId?: string;
}

export const useStoreTheme = (
  catalog: ThemeSource | null | undefined,
  { applyToRoot = true, styleId = 'store-theme-styles' }: UseStoreThemeOptions = {}
) => {
  const tokens = useMemo(
    () => (catalog ? computeStoreTheme(catalog) : null),
    [
      catalog?.primary_color,
      catalog?.background_color,
      catalog?.surface_color,
      catalog?.text_color,
      catalog?.title_color,
    ]
  );

  useEffect(() => {
    if (!tokens || !applyToRoot) return;

    const css = Object.entries(tokens)
      .map(([key, value]) => `${key}: ${value} !important;`)
      .join('\n');

    document.getElementById(styleId)?.remove();
    const styleEl = document.createElement('style');
    styleEl.id = styleId;
    styleEl.innerHTML = `:root {\n${css}\nfont-family: 'Inter', system-ui, sans-serif !important;\n}`;
    document.head.appendChild(styleEl);

    return () => {
      document.getElementById(styleId)?.remove();
    };
  }, [tokens, applyToRoot, styleId]);

  return {
    themeStyles: (tokens || {}) as React.CSSProperties,
    titleColor: tokens?.['--title-color'],
  };
};
