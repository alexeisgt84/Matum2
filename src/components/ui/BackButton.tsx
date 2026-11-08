import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

interface BackButtonProps {
  onClick?: () => void;
  className?: string;
  variant?: 'minimal' | 'filled';
}

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

  const baseStyles = "p-1.5 transition-all active:scale-95 group rounded-none";
  const variants = {
    minimal: "text-secondary hover:text-[var(--accent)] hover:bg-surface-hover",
    filled: "bg-surface-hover border border-border shadow-sm text-secondary hover:text-[var(--accent)] hover:bg-surface"
  };

  return (
    <button 
      onClick={handleClick}
      className={`${baseStyles} ${variants[variant]} ${className}`}
      aria-label="Volver"
    >
      <ArrowLeft 
        size={16} 
        className="group-hover:-translate-x-0.5 transition-transform" 
      />
    </button>
  );
};
