import React, { createContext, useContext, useState, ReactNode } from 'react';
import { LogoViewerModal } from '../components/LogoViewerModal';

interface LogoModalContextType {
  openLogoModal: () => void;
  closeLogoModal: () => void;
  isLogoModalOpen: boolean;
}

const LogoModalContext = createContext<LogoModalContextType | undefined>(undefined);

export const LogoModalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);

  const openLogoModal = () => setIsOpen(true);
  const closeLogoModal = () => setIsOpen(false);

  return (
    <LogoModalContext.Provider value={{ openLogoModal, closeLogoModal, isLogoModalOpen: isOpen }}>
      {children}
      <LogoViewerModal isOpen={isOpen} onClose={closeLogoModal} />
    </LogoModalContext.Provider>
  );
};

export const useLogoModal = (): LogoModalContextType => {
  const context = useContext(LogoModalContext);
  if (!context) {
    throw new Error('useLogoModal must be used within a LogoModalProvider');
  }
  return context;
};
