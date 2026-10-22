import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { LogoViewerModal } from '../components/LogoViewerModal';

interface LogoModalContextType {
  openLogoModal: () => void;
  closeLogoModal: () => void;
  isOpen: boolean;
}

const LogoModalContext = createContext<LogoModalContextType | undefined>(undefined);

export const LogoModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);

  const openLogoModal = useCallback(() => {
    setIsOpen(true);
  }, []);

  const closeLogoModal = useCallback(() => {
    setIsOpen(false);
  }, []);

  // Listen to custom event so any non-React or deep element can trigger it as well
  useEffect(() => {
    const handleTrigger = () => setIsOpen(true);
    window.addEventListener('open-logo-modal', handleTrigger);
    return () => window.removeEventListener('open-logo-modal', handleTrigger);
  }, []);

  return (
    <LogoModalContext.Provider value={{ openLogoModal, closeLogoModal, isOpen }}>
      {children}
      <LogoViewerModal isOpen={isOpen} onClose={closeLogoModal} />
    </LogoModalContext.Provider>
  );
};

export const useLogoModal = (): LogoModalContextType => {
  const context = useContext(LogoModalContext);
  if (!context) {
    // Graceful fallback if used outside provider: dispatches custom DOM event
    return {
      openLogoModal: () => window.dispatchEvent(new CustomEvent('open-logo-modal')),
      closeLogoModal: () => {},
      isOpen: false,
    };
  }
  return context;
};
