import { createI18n } from 'vue-i18n';
import en from './locales/en';
import zhCN from './locales/zh-CN';
import zhTW from './locales/zh-TW';

export type Locale = 'en' | 'zh-CN' | 'zh-TW';
export const LOCALES: { code: Locale; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'zh-CN', label: '简体中文' },
  { code: 'zh-TW', label: '繁體中文' }
];

const STORAGE_KEY = 'ccse-locale';

// No browser language detection — defaults to English; once the user manually
// switches, the choice is written to localStorage and reused on next load.
function detectLocale(): Locale {
  const stored = localStorage.getItem(STORAGE_KEY) as Locale | null;
  return stored && LOCALES.some(l => l.code === stored) ? stored : 'en';
}

export const i18n = createI18n({
  legacy: false,
  globalInjection: true,
  locale: detectLocale(),
  fallbackLocale: 'en',
  messages: { 'zh-CN': zhCN, 'zh-TW': zhTW, en }
});

export function setLocale(locale: Locale) {
  i18n.global.locale.value = locale;
  localStorage.setItem(STORAGE_KEY, locale);
}
