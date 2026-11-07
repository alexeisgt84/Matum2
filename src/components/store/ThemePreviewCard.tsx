import React from 'react';
import { AlertCircle, ShoppingBag } from 'lucide-react';
import {
  STORE_THEME_PRESETS,
  checkThemeContrast,
  getContrastColor,
  type ThemeSource,
} from '../../hooks/useStoreTheme';

interface ThemePresetGridProps {
  theme: ThemeSource;
  onApplyPreset: (colors: {
    primary_color: string;
    background_color: string;
    surface_color: string;
    title_color: string;
    text_color: string;
  }) => void;
}

export const ThemePresetGrid: React.FC<ThemePresetGridProps> = ({ theme, onApplyPreset }) => (
  <div className="space-y-2 border-t border-border/40 pt-4">
    <label className="text-[9px] font-bold text-secondary uppercase tracking-wider block ml-0.5">
      Temas recomendados
    </label>
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {STORE_THEME_PRESETS.map(preset => {
        const isActive =
          theme.primary_color?.toLowerCase() === preset.colors.primary_color.toLowerCase() &&
          theme.background_color?.toLowerCase() === preset.colors.background_color.toLowerCase() &&
          theme.surface_color?.toLowerCase() === preset.colors.surface_color.toLowerCase();

        return (
          <button
            key={preset.id}
            type="button"
            onClick={() => onApplyPreset(preset.colors)}
            className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all ${
              isActive
                ? 'border-[var(--accent)] bg-[var(--accent)]/10 ring-1 ring-[var(--accent)]/40'
                : 'border-border bg-surface-hover/40 hover:bg-surface-hover'
            }`}
          >
            <div
              style={{ backgroundColor: preset.colors.background_color }}
              className="w-8 h-8 rounded-lg border border-black/15 flex items-center justify-center flex-shrink-0 shadow-inner"
            >
              <span
                style={{ backgroundColor: preset.colors.primary_color }}
                className="w-3.5 h-3.5 rounded-full ring-2 ring-white/40"
              />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-primary truncate">{preset.name}</div>
              <div className="text-[10px] text-secondary truncate">{preset.subtitle}</div>
            </div>
          </button>
        );
      })}
    </div>
  </div>
);

interface ThemePreviewCardProps {
  storeName?: string | null;
  slogan?: string | null;
  theme: ThemeSource;
  onFixField: (field: 'text_color' | 'title_color', color: string) => void;
}

export const ThemePreviewCard: React.FC<ThemePreviewCardProps> = ({
  storeName,
  slogan,
  theme,
  onFixField,
}) => {
  const warnings = checkThemeContrast(theme);
  const bg = theme.background_color || '#0a0a0a';
  const surface = theme.surface_color || '#1a1a1a';
  const accent = theme.primary_color || '#ff782e';
  const text = theme.text_color || getContrastColor(bg);
  const title = theme.title_color || text;

  return (
    <>
      {warnings.length > 0 && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2">
          {warnings.map(w => (
            <div key={w.field} className="flex items-center justify-between gap-2 text-xs">
              <span className="text-amber-500 font-medium flex items-center gap-1.5">
                <AlertCircle size={14} className="flex-shrink-0" />
                <span>
                  {w.label} ({w.ratio}:1)
                </span>
              </span>
              <button
                type="button"
                onClick={() => onFixField(w.field, w.suggestedColor)}
                className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 font-bold text-[10px] flex-shrink-0"
              >
                Corregir a {w.suggestedColor}
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="bg-surface-hover/30 p-4 rounded-2xl border border-border/40 space-y-3">
        <label className="text-[10px] font-bold text-secondary uppercase tracking-wider block">
          Vista previa en tiempo real
        </label>

        <div
          style={{ backgroundColor: bg }}
          className="p-4 rounded-xl border border-border/60 transition-all font-store"
        >
          <div className="max-w-[300px] mx-auto space-y-3">
            {/* Cabecera mock */}
            <div className="flex items-center gap-2.5 pb-2.5 border-b" style={{ borderColor: `${text}1a` }}>
              <div
                style={{
                  backgroundColor: accent,
                  color: getContrastColor(accent),
                }}
                className="w-9 h-9 rounded-2xl flex items-center justify-center font-display font-extrabold text-sm shadow-sm flex-shrink-0"
              >
                {(storeName || 'T').charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div
                  style={{ color: title }}
                  className="font-display text-sm font-bold tracking-tight truncate"
                >
                  {storeName || 'Nombre de la tienda'}
                </div>
                <div style={{ color: `${text}b3` }} className="text-[11px] truncate">
                  {slogan || 'Eslogan de tu tienda'}
                </div>
              </div>
            </div>

            {/* Cuadrícula de 2 productos */}
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { name: 'Café artesanal 250g', price: '1 200 CUP' },
                { name: 'Taza cerámica mate', price: '850 CUP' },
              ].map((item, idx) => (
                <div key={idx} className="space-y-1.5">
                  <div
                    style={{
                      backgroundColor: surface,
                      borderColor: `${text}1c`,
                    }}
                    className="relative aspect-square rounded-xl border flex items-center justify-center"
                  >
                    <ShoppingBag size={20} style={{ color: accent }} />
                    <span
                      style={{
                        backgroundColor: accent,
                        color: getContrastColor(accent),
                      }}
                      className="absolute bottom-1.5 right-1.5 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shadow"
                    >
                      +
                    </span>
                  </div>
                  <div style={{ color: text }} className="text-[11px] font-medium truncate">
                    {item.name}
                  </div>
                  <div style={{ color: text }} className="text-xs font-bold">
                    {item.price}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
