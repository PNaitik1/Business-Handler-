import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import enTranslation from './locales/en.json';
import hiTranslation from './locales/hi.json';

const savedLang = localStorage.getItem('supplysync_lang') || 'en';
// Normalize if previously stored as 'EN' or 'HI'
const normalizedLang = savedLang.toLowerCase().includes('hi') ? 'hi' : 'en';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: enTranslation },
      hi: { translation: hiTranslation }
    },
    lng: normalizedLang,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false // React already escapes values
    }
  });

// Listen to language change to preserve in localStorage
i18n.on('languageChanged', (lng) => {
  localStorage.setItem('supplysync_lang', lng);
});

export default i18n;
