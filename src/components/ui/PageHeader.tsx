import React, { useEffect } from 'react';
import { useHeader } from '../../lib/HeaderContext';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  rightAction?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ 
  title, 
  subtitle, 
  rightAction 
}) => {
  const { setTitle, setSubtitle, setRightAction } = useHeader();

  useEffect(() => {
    setTitle(title);
    setSubtitle(subtitle || null);
    setRightAction(rightAction || null);

    return () => {
      setTitle(null);
      setSubtitle(null);
      setRightAction(null);
    };
  }, [title, subtitle, rightAction, setTitle, setSubtitle, setRightAction]);

  return null;
};
