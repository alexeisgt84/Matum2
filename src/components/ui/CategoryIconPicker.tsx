import React, { useState, useMemo } from 'react';
import { Search, X, Sparkles } from 'lucide-react';
import {
  CATEGORY_ICONS,
  CATEGORY_ICON_GROUPS,
  POPULAR_CATEGORY_ICONS,
  type CategoryIconItem,
  type CategoryIconGroup
} from '../../constants/categoryIcons';
import { CategoryIcon } from './CategoryIcon';

interface CategoryIconPickerProps {
  selectedIcon: string;
  onSelectIcon: (iconValue: string) => void;
  className?: string;
  maxHeight?: string;
}

export const CategoryIconPicker: React.FC<CategoryIconPickerProps> = ({
  selectedIcon,
  onSelectIcon,
  className = '',
  maxHeight = 'max-h-[320px]'
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeGroup, setActiveGroup] = useState<string>('Todos');

  // Filtrado reactivo de iconos
  const filteredIcons = useMemo(() => {
    let list: CategoryIconItem[] = CATEGORY_ICONS;

    if (activeGroup === 'Recomendados') {
      list = POPULAR_CATEGORY_ICONS;
    } else if (activeGroup !== 'Todos') {
      list = CATEGORY_ICONS.filter(item => item.group === activeGroup);
    }

    const query = searchQuery.trim().toLowerCase();
    if (!query) return list;

    // Búsqueda inteligente por label, nombre y keywords
    return list.filter(item => {
      const matchLabel = item.label.toLowerCase().includes(query);
      const matchValue = item.value.toLowerCase().includes(query);
      const matchGroup = item.group.toLowerCase().includes(query);
      const matchKeywords = item.keywords.some(k => k.toLowerCase().includes(query));
      return matchLabel || matchValue || matchGroup || matchKeywords;
    });
  }, [searchQuery, activeGroup]);

  // Icono actualmente seleccionado en el catálogo maestro
  const currentItem = useMemo(() => {
    return CATEGORY_ICONS.find(i => i.value.toLowerCase() === selectedIcon.toLowerCase()) || {
      value: selectedIcon,
      label: selectedIcon,
      group: 'Personalizado'
    };
  }, [selectedIcon]);

  return (
    <div className={`flex flex-col gap-2.5 bg-background border border-border rounded-2xl p-3 shadow-sm ${className}`}>
      {/* Cabecera / Buscador */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar icono (ej: solar, moto, split, tv, olla, dinero...)"
            className="w-full h-9 pl-9 pr-8 rounded-xl bg-surface-hover/50 border border-border text-xs text-primary placeholder:text-secondary/60 focus:outline-none focus:border-accent focus:bg-background transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-secondary hover:text-primary p-0.5 rounded-full"
              title="Borrar búsqueda"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Vista previa compacta del icono seleccionado */}
        <div 
          className="flex items-center gap-2 px-2.5 py-1 rounded-xl bg-surface border border-border shrink-0 shadow-inner"
          title={`Icono activo: ${currentItem.label}`}
        >
          <div className="text-accent flex items-center justify-center">
            <CategoryIcon name={selectedIcon} size={18} />
          </div>
          <span className="text-[11px] font-bold text-primary max-w-[100px] truncate hidden sm:inline">
            {currentItem.label}
          </span>
        </div>
      </div>

      {/* Selector de Grupos Temáticos con Scroll Horizontal */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px]">
        <button
          type="button"
          onClick={() => setActiveGroup('Todos')}
          className={`px-2.5 py-1 rounded-lg font-semibold shrink-0 transition-all border ${
            activeGroup === 'Todos'
              ? 'bg-accent text-white border-accent shadow-xs'
              : 'bg-surface-hover/40 border-border text-secondary hover:text-primary hover:bg-surface-hover'
          }`}
        >
          Todos ({CATEGORY_ICONS.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveGroup('Recomendados')}
          className={`px-2.5 py-1 rounded-lg font-semibold shrink-0 transition-all border flex items-center gap-1 ${
            activeGroup === 'Recomendados'
              ? 'bg-accent text-white border-accent shadow-xs'
              : 'bg-surface-hover/40 border-border text-secondary hover:text-primary hover:bg-surface-hover'
          }`}
        >
          <Sparkles size={12} />
          <span>Populares ({POPULAR_CATEGORY_ICONS.length})</span>
        </button>

        {CATEGORY_ICON_GROUPS.filter(g => g !== 'Todos').map(group => (
          <button
            key={group}
            type="button"
            onClick={() => setActiveGroup(group)}
            className={`px-2.5 py-1 rounded-lg font-semibold shrink-0 transition-all border ${
              activeGroup === group
                ? 'bg-accent text-white border-accent shadow-xs'
                : 'bg-surface-hover/40 border-border text-secondary hover:text-primary hover:bg-surface-hover'
            }`}
          >
            {group}
          </button>
        ))}
      </div>

      {/* Grid de Iconos */}
      <div className={`overflow-y-auto pr-1 ${maxHeight} min-h-[140px]`}>
        {filteredIcons.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center text-secondary gap-1">
            <span className="text-xs font-semibold">No se encontraron iconos</span>
            <p className="text-[11px] text-secondary/70">
              Prueba con otro término como "solar", "frio", "moto", "herramienta" o selecciona "Todos".
            </p>
            <button
              type="button"
              onClick={() => { setSearchQuery(''); setActiveGroup('Todos'); }}
              className="mt-2 text-xs text-accent font-bold hover:underline"
            >
              Restablecer filtros
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-1.5">
            {filteredIcons.map((item) => {
              const isSelected = selectedIcon.toLowerCase() === item.value.toLowerCase();
              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => onSelectIcon(item.value)}
                  className={`group relative flex flex-col items-center justify-center p-2 rounded-xl border transition-all duration-150 ${
                    isSelected
                      ? 'bg-accent/15 border-accent text-accent scale-105 shadow-sm shadow-accent/20 ring-1 ring-accent/40 font-bold'
                      : 'bg-surface/50 border-border text-secondary hover:text-primary hover:bg-surface-hover hover:border-accent/40'
                  }`}
                  title={`${item.label} (${item.group})`}
                >
                  <div className="flex items-center justify-center transition-transform group-hover:scale-110">
                    <CategoryIcon name={item.value} size={20} />
                  </div>
                  <span className="text-[9px] text-center truncate w-full mt-1 opacity-80 group-hover:opacity-100 leading-tight">
                    {item.label.split('/')[0].trim()}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Pie con contador e indicación rápida */}
      <div className="flex items-center justify-between pt-1 border-t border-border/40 text-[10px] text-secondary">
        <span>Mostrando {filteredIcons.length} iconos</span>
        <span>Haz clic para seleccionar</span>
      </div>
    </div>
  );
};
