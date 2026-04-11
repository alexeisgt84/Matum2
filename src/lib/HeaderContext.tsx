import React, { createContext, useContext, useState, ReactNode } from 'react';

interface HeaderContextType {
  title: string | null;
  setTitle: (title: string | null) => void;
  subtitle: string | null;
  setSubtitle: (subtitle: string | null) => void;
  rightAction: ReactNode | null;
  setRightAction: (action: ReactNode | null) => void;
}

const HeaderContext = createContext<HeaderContextType | undefined>(undefined);

export const HeaderProvider = ({ children }: { children: ReactNode }) => {
  const [title, setTitle] = useState<string | null>(null);
  const [subtitle, setSubtitle] = useState<string | null>(null);
  const [rightAction, setRightAction] = useState<ReactNode | null>(null);

  return (
    <HeaderContext.Provider value={{ title, setTitle, subtitle, setSubtitle, rightAction, setRightAction }}>
      {children}
    </HeaderContext.Provider>
  );
};

export const useHeader = () => {
  const context = useContext(HeaderContext);
  if (context === undefined) {
    throw new Error('useHeader must be used within a HeaderProvider');
  }
  return context;
};
