import React, { useEffect } from 'react';
import { useHeader } from '../../lib/HeaderContext';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  rightAction?: React.ReactNode;
  onBack?: (() => void) | null;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ 
  title, 
  subtitle, 
  rightAction,
  onBack
}) => {
  const { setTitle, setSubtitle, setRightAction, setOnBack } = useHeader();

  useEffect(() => {
    setTitle(title);
    setSubtitle(subtitle || null);
    setRightAction(rightAction || null);
    setOnBack(onBack || null);

    return () => {
      setTitle(null);
      setSubtitle(null);
      setRightAction(null);
      setOnBack(null);
    };
  }, [title, subtitle, rightAction, onBack, setTitle, setSubtitle, setRightAction, setOnBack]);

  return null;
};
