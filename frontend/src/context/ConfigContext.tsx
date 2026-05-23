import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';

// 注音字型選項：'none' = 不用字型（用 <ruby>/<rt> 標註）；其他為字型 family 名稱
export type BpmfFont = 'none' | 'BpmfHuninn' | 'BpmfIansui' | 'BpmfZihiKai' | 'BpmfGenYoGothic';

export const BPMF_FONT_LABELS: Record<BpmfFont, string> = {
  none:             '不用字型（標註注音）',
  BpmfHuninn:       '粉圓注音 Huninn（現代）',
  BpmfIansui:       '芫荽注音 Iansui（手寫）',
  BpmfZihiKai:      '字嗨楷體（教育楷書）',
  BpmfGenYoGothic:  '源樣黑體（黑體）',
};

interface ConfigContextValue {
  showZhuyin: boolean;
  toggleZhuyin: () => void;
  fontSize: 'normal' | 'large';
  toggleFontSize: () => void;
  language: string;
  setLanguage: (lang: string) => void;
  bpmfFont: BpmfFont;
  setBpmfFont: (f: BpmfFont) => void;
}

const ConfigContext = createContext<ConfigContextValue | null>(null);

const STORAGE_KEY_FONT = 'rm_bpmf_font';

export function ConfigProvider({ children }: { children: React.ReactNode }) {
  const [showZhuyin, setShowZhuyin] = useState(true);
  const [fontSize, setFontSize] = useState<'normal' | 'large'>('normal');
  const [language, setLanguage] = useState('zh-TW');
  const [bpmfFont, setBpmfFontState] = useState<BpmfFont>(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_FONT) : null;
    // 預設使用教育楷書（最像課本字型）
    return (saved as BpmfFont) || 'BpmfZihiKai';
  });

  const toggleZhuyin = () => setShowZhuyin((v) => !v);
  const toggleFontSize = () =>
    setFontSize((v) => (v === 'normal' ? 'large' : 'normal'));

  const setBpmfFont = (f: BpmfFont) => {
    setBpmfFontState(f);
    if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY_FONT, f);
  };

  // 把選擇的字型寫入 CSS 變數，讓 .bpmf-font class 自動用最新字型
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (bpmfFont === 'none') {
      document.documentElement.style.removeProperty('--bpmf-font-family');
    } else {
      document.documentElement.style.setProperty('--bpmf-font-family', `'${bpmfFont}'`);
    }
  }, [bpmfFont]);

  return (
    <ConfigContext.Provider
      value={{
        showZhuyin, toggleZhuyin,
        fontSize, toggleFontSize,
        language, setLanguage,
        bpmfFont, setBpmfFont,
      }}
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
