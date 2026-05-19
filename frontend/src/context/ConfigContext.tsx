import React, { createContext, useContext, useState } from 'react';
import { useAuth } from './AuthContext';

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

/**
 * 推導 SEN（輕鬆學習）佈局是否啟用。
 * - 後端標記 user.is_sen_mode=1，或
 * - 使用者手動把 fontSize 切到 'large'
 */
export function useSenLayout(): boolean {
  const { user } = useAuth();
  const { fontSize } = useConfig();
  return !!user?.is_sen_mode || fontSize === 'large';
}
