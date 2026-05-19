import React, { createContext, useContext, useState } from 'react';

interface ConfigContextValue {
  showZhuyin: boolean;
  toggleZhuyin: () => void;
  fontSize: 'normal' | 'large';
  toggleFontSize: () => void;
  language: string;
  setLanguage: (lang: string) => void;
}

const ConfigContext = createContext<ConfigContextValue | null>(null);

export function ConfigProvider({ children }: { children: React.ReactNode }) {
  const [showZhuyin, setShowZhuyin] = useState(true);
  const [fontSize, setFontSize] = useState<'normal' | 'large'>('normal');
  const [language, setLanguage] = useState('zh-TW');

  const toggleZhuyin = () => setShowZhuyin((v) => !v);
  const toggleFontSize = () =>
    setFontSize((v) => (v === 'normal' ? 'large' : 'normal'));

  return (
    <ConfigContext.Provider
      value={{ showZhuyin, toggleZhuyin, fontSize, toggleFontSize, language, setLanguage }}
    >
      {children}
    </ConfigContext.Provider>
  );
}

export function useConfig(): ConfigContextValue {
  const ctx = useContext(ConfigContext);
  if (!ctx) throw new Error('useConfig must be used within ConfigProvider');
  return ctx;
}
