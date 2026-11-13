import React from 'react';
import * as Icons from 'lucide-react';
import { normalizeCategoryIconName } from '../../constants/categoryIcons';

interface CategoryIconProps {
  name?: string | null;
  size?: number;
  className?: string;
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({ name, size = 16, className = '' }) => {
  if (!name) return <Icons.Folder size={size} className={className} />;

  const lucideName = normalizeCategoryIconName(name);
  const IconComponent = (Icons as any)[lucideName] || Icons.Folder;

  return <IconComponent size={size} className={className} />;
};
