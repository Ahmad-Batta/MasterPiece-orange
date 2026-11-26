import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import ar from './locales/ar.json';

const storedLanguage = window.localStorage.getItem('careerhub_language');
const initialLanguage = storedLanguage === 'ar' ? 'ar' : 'en';

export function applyDocumentLanguage(language) {
  const safeLanguage = language === 'ar' ? 'ar' : 'en';
  document.documentElement.lang = safeLanguage;
  document.documentElement.dir = safeLanguage === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.dataset.language = safeLanguage;
  window.localStorage.setItem('careerhub_language', safeLanguage);
}

i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, ar: { translation: ar } },
  lng: initialLanguage,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  returnNull: false,
});

applyDocumentLanguage(initialLanguage);
i18n.on('languageChanged', applyDocumentLanguage);

export default i18n;
