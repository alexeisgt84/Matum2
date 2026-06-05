import React from 'react';
import * as Icons from 'lucide-react';

interface CategoryIconProps {
  name?: string | null;
  size?: number;
  className?: string;
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({ name, size = 16, className = '' }) => {
  if (!name) return <Icons.Folder size={size} className={className} />;

  // Mapear nombres antiguos de Ionicons o valores personalizados a componentes de Lucide
  const mapToLucide = (iconName: string): string => {
    const norm = iconName.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
    switch (norm) {
      case 'shirt': return 'Shirt';
      case 'fastfood': 
      case 'pizza': return 'Pizza';
      case 'home': return 'Home';
      case 'phoneportrait':
      case 'smartphone': return 'Smartphone';
      case 'sparkles': return 'Sparkles';
      case 'construct':
      case 'wrench': return 'Wrench';
      case 'car': return 'Car';
      case 'ellipsishorizontal':
      case 'morehorizontal': return 'MoreHorizontal';
      case 'folder': return 'Folder';
      case 'utensils': return 'Utensils';
      case 'coffee': return 'Coffee';
      case 'laptop': return 'Laptop';
      case 'heart': return 'Heart';
      case 'shoppingbag': return 'ShoppingBag';
      case 'gift': return 'Gift';
      case 'bookopen': return 'BookOpen';
      case 'gamepad2': return 'Gamepad2';
      case 'flower2': return 'Flower2';
      case 'music': return 'Music';
      case 'tag': return 'Tag';
      default:
        // Intentar capitalizar el nombre para ver si coincide directamente con Lucide
        const capitalized = iconName.charAt(0).toUpperCase() + iconName.slice(1);
        if (capitalized in Icons) {
          return capitalized;
        }
        return 'Folder';
    }
  };

  const lucideName = mapToLucide(name);
  const IconComponent = (Icons as any)[lucideName] || Icons.Folder;

  return <IconComponent size={size} className={className} />;
};
