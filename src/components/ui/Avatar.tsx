import React from 'react';

interface AvatarProps {
  src?: string | null;
  nombre: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({ src, nombre, size = 'md', className = '' }) => {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getColorFromName = (name: string) => {
    const colors = [
      'bg-blue-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-indigo-500',
      'bg-teal-500',
      'bg-orange-500',
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const sizes = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-12 h-12 text-sm',
    lg: 'w-20 h-20 text-xl',
    xl: 'w-32 h-32 text-3xl',
  };

  if (src) {
    return (
      <img
        src={src}
        alt={nombre}
        className={`${sizes[size]} rounded-full object-cover border-2 border-white/5 ${className}`}
      />
    );
  }

  return (
    <div className={`${sizes[size]} rounded-full flex items-center justify-center font-bold text-white shadow-inner border-2 border-white/5 ${getColorFromName(nombre)} ${className}`}>
      {getInitials(nombre)}
    </div>
  );
};
