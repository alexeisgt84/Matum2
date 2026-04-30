import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

interface BackButtonProps {
  onClick?: () => void;
  className?: string;
  variant?: 'minimal' | 'filled';
}

/**
 * BackButton - Componente reutilizable para retroceder en la navegación.
 * Sigue el diseño premium con micro-animaciones.
 */
export const BackButton: React.FC<BackButtonProps> = ({ 
  onClick, 
  className = '',
  variant = 'filled'
}) => {
  const navigate = useNavigate();
  
  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      navigate(-1);
    }
  };

  const baseStyles = "p-2.5 transition-all hover:scale-105 active:scale-95 group";
  const variants = {
    minimal: "text-gray-400 hover:text-[var(--accent)] hover:bg-white/5 rounded-full",
    filled: "bg-white/5 border border-white/5 shadow-lg rounded-2xl text-gray-400 hover:text-[var(--accent)] hover:bg-white/10"
  };

  return (
    <button 
      onClick={handleClick}
      className={`${baseStyles} ${variants[variant]} ${className}`}
      aria-label="Volver"
    >
      <ArrowLeft 
        size={22} 
        className="group-hover:-translate-x-0.5 transition-transform" 
      />
    </button>
  );
};
