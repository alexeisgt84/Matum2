import React, { useState, useMemo } from 'react';
import { ChevronDown } from 'lucide-react';

export interface ProductCollapsibleDetailsProps {
  description?: string | null;
  detailsAndDimensions?: string | null;
  careAndMaintenance?: string | null;
  className?: string;
  defaultOpen?: {
    description?: boolean;
    details?: boolean;
    care?: boolean;
  };
}

/**
 * Función auxiliar para extraer inteligentemente secciones desde descripciones
 * que contengan encabezados textuales (para retrocompatibilidad con productos anteriores)
 */
function parseSections(
  rawDesc?: string | null,
  rawDetails?: string | null,
  rawCare?: string | null
): { description: string; details: string; care: string } {
  let description = (rawDesc || '').trim();
  let details = (rawDetails || '').trim();
  let care = (rawCare || '').trim();

  // Si ya tenemos los campos explícitos, no necesitamos parsear el texto de la descripción
  if (details && care) {
    return { description, details, care };
  }

  // Si no hay detalles o cuidados explícitos, intentamos detectar encabezados comunes en la descripción
  if (description) {
    // Detectar sección de detalles / especificaciones
    if (!details) {
      const detailsRegex = /(?:ESPECIFICACIONES(?:\s+TÉCNICAS)?|DETALLES(?:\s+Y\s+DIMENSIONES)?|DIMENSIONES|CARACTERÍSTICAS(?:\s+PRINCIPALES)?):\s*([\s\S]*?)(?=(?:CUIDADO(?:\s+Y\s+MANTENIMIENTO)?|ESTADO(?:\s+Y\s+CONTENIDO)?|$))/i;
      const matchDetails = description.match(detailsRegex);
      if (matchDetails && matchDetails[1]?.trim()) {
        details = matchDetails[1].trim();
      }
    }

    // Detectar sección de cuidado y mantenimiento
    if (!care) {
      const careRegex = /(?:CUIDADO(?:\s+Y\s+MANTENIMIENTO)?|MANTENIMIENTO|INSTRUCCIONES\s+DE\s+CUIDADO):\s*([\s\S]*?)(?=(?:ESPECIFICACIONES|DETALLES|ESTADO|$))/i;
      const matchCare = description.match(careRegex);
      if (matchCare && matchCare[1]?.trim()) {
        care = matchCare[1].trim();
      }
    }

    // Si extrajimos detalles o cuidado del texto, limpiar la descripción principal de esas secciones
    if (details || care) {
      let cleanDesc = description;
      cleanDesc = cleanDesc.replace(/(?:ESPECIFICACIONES(?:\s+TÉCNICAS)?|DETALLES(?:\s+Y\s+DIMENSIONES)?|DIMENSIONES|CARACTERÍSTICAS(?:\s+PRINCIPALES)?):\s*[\s\S]*?(?=(?:CUIDADO(?:\s+Y\s+MANTENIMIENTO)?|ESTADO(?:\s+Y\s+CONTENIDO)?|$))/i, '');
      cleanDesc = cleanDesc.replace(/(?:CUIDADO(?:\s+Y\s+MANTENIMIENTO)?|MANTENIMIENTO|INSTRUCCIONES\s+DE\s+CUIDADO):\s*[\s\S]*?(?=(?:ESPECIFICACIONES|DETALLES|ESTADO|$))/i, '');
      cleanDesc = cleanDesc.replace(/PRODUCTO:\s*/i, '').trim();
      if (cleanDesc.length > 0) {
        description = cleanDesc;
      }
    }
  }

  return { description, details, care };
}

export const ProductCollapsibleDetails: React.FC<ProductCollapsibleDetailsProps> = ({
  description: rawDescription,
  detailsAndDimensions: rawDetails,
  careAndMaintenance: rawCare,
  className = '',
  defaultOpen = { description: true, details: false, care: false },
}) => {
  const { description, details, care } = useMemo(
    () => parseSections(rawDescription, rawDetails, rawCare),
    [rawDescription, rawDetails, rawCare]
  );

  const [openSections, setOpenSections] = useState<{ [key: string]: boolean }>({
    description: defaultOpen.description ?? true,
    details: defaultOpen.details ?? false,
    care: defaultOpen.care ?? false,
  });

  const toggleSection = (key: string) => {
    setOpenSections(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Si no hay ningún dato en ninguna de las tres secciones, no renderizar nada
  if (!description && !details && !care) {
    return null;
  }

  const sections = [
    {
      id: 'description',
      title: 'Descripción',
      content: description,
      hasContent: Boolean(description),
      emptyText: 'No se ha añadido una descripción para este producto.',
    },
    {
      id: 'details',
      title: 'Detalles y dimensiones',
      content: details,
      hasContent: Boolean(details),
      emptyText: 'No hay detalles o dimensiones especificadas aún.',
    },
    {
      id: 'care',
      title: 'Cuidado y mantenimiento',
      content: care,
      hasContent: Boolean(care),
      emptyText: 'No hay recomendaciones de cuidado y mantenimiento registradas.',
    },
  ];

  return (
    <div className={`divide-y divide-border/60 border-b border-border/60 ${className}`}>
      {sections.map(section => {
        if (!section.hasContent) return null;

        const isOpen = Boolean(openSections[section.id]);

        return (
          <div key={section.id}>
            <button
              type="button"
              onClick={() => toggleSection(section.id)}
              className="w-full py-4 flex items-center justify-between gap-3 text-left text-primary hover:text-primary/80 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-sm"
              aria-expanded={isOpen}
              aria-controls={`section-content-${section.id}`}
            >
              <span className="text-sm font-semibold truncate">{section.title}</span>
              <ChevronDown
                size={16}
                className={`text-secondary shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {isOpen && (
              <div
                id={`section-content-${section.id}`}
                className="pb-5 -mt-1 text-sm text-primary/80 leading-relaxed whitespace-pre-line animate-store-fade-up"
              >
                {section.content || <span className="italic">{section.emptyText}</span>}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
