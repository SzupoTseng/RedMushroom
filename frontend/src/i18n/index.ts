import { useConfig } from '../context/ConfigContext';
import { zhTW, type Locale } from './locales/zh-TW';
import { en } from './locales/en';
import { ja } from './locales/ja';
import { ko } from './locales/ko';

export type SupportedLocale = 'zh-TW' | 'en' | 'ja' | 'ko';

export const SUPPORTED_LOCALES: { value: SupportedLocale; label: string; flag: string }[] = [
  { value: 'zh-TW', label: '繁體中文', flag: '🇹🇼' },
  { value: 'en',    label: 'English',  flag: '🇺🇸' },
  { value: 'ja',    label: '日本語',   flag: '🇯🇵' },
  { value: 'ko',    label: '한국어',   flag: '🇰🇷' },
];

const locales: Record<SupportedLocale, Locale> = { 'zh-TW': zhTW, en, ja, ko };

/** Traverse nested object with dot-notation key, e.g. 'quiz.correct' */
function get(obj: Record<string, unknown>, path: string): string {
  const value = path.split('.').reduce<unknown>((acc, key) => {
    if (acc !== null && typeof acc === 'object') {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
  return typeof value === 'string' ? value : path;
}

/**
 * useTranslation — returns a `t(key, vars?)` function.
 *
 * Supports simple variable interpolation:
 *   t('quiz.questionOf', { n: 3, total: 10 }) → "第 3 題，共 10 題"
 */
export function useTranslation() {
  const { language } = useConfig();
  const localeKey = (language as SupportedLocale) in locales ? (language as SupportedLocale) : 'zh-TW';
  const locale = locales[localeKey];

  function t(key: string, vars?: Record<string, string | number>): string {
    let text = get(locale as unknown as Record<string, unknown>, key);
    if (vars) {
      Object.entries(vars).forEach(([k, v]) => {
        text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
      });
    }
    return text;
  }

  return { t, currentLocale: localeKey };
}
