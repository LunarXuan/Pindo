'use client';
import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { zh, type I18nKey } from './zh';
import { en } from './en';

type Lang = 'zh' | 'en';
const dicts = { zh, en } as const;

interface I18nCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: I18nKey) => string;
}

const Ctx = createContext<I18nCtx>(null!);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>('zh');
  const t = useCallback((key: I18nKey) => dicts[lang][key] ?? key, [lang]);
  return <Ctx.Provider value={{ lang, setLang, t }}>{children}</Ctx.Provider>;
}

export function useI18n() { return useContext(Ctx); }
