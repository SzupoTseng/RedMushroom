import React, { useState, useRef, useEffect } from 'react';
import { useConfig } from '../../context/ConfigContext';
import { SUPPORTED_LOCALES, type SupportedLocale } from '../../i18n';

export default function LanguageSwitcher() {
  const { language, setLanguage } = useConfig();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const current = SUPPORTED_LOCALES.find((l) => l.value === language) ?? SUPPORTED_LOCALES[0];

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200
                   bg-white text-sm font-medium text-gray-700 hover:bg-gray-50
                   focus:outline-none focus:ring-2 focus:ring-mushroom-400 transition"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="text-base leading-none">{current.flag}</span>
        <span>{current.label}</span>
        <svg className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`}
             fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute right-0 mt-1 w-40 bg-white rounded-xl shadow-lg border border-gray-100
                     py-1 z-50 text-sm"
        >
          {SUPPORTED_LOCALES.map((locale) => (
            <li
              key={locale.value}
              role="option"
              aria-selected={locale.value === language}
              onClick={() => {
                setLanguage(locale.value as SupportedLocale);
                setOpen(false);
              }}
              className={`flex items-center gap-2.5 px-4 py-2 cursor-pointer transition
                          ${locale.value === language
                            ? 'bg-mushroom-50 text-mushroom-700 font-semibold'
                            : 'text-gray-700 hover:bg-gray-50'}`}
            >
              <span className="text-base">{locale.flag}</span>
              {locale.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
