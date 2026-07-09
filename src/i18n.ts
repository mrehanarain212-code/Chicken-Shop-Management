import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import enJSON from './locales/en.json';
import urJSON from './locales/ur.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: enJSON },
      ur: { translation: urJSON }
    },
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
      format: (value: any, format: string, lng: string) => {
        if (format === 'currency' && typeof value === 'number') {
          return new Intl.NumberFormat(lng === 'ur' ? 'ur-PK' : 'en-US', {
            maximumFractionDigits: 2,
            minimumFractionDigits: 0
          }).format(value);
        }
        return value;
      }
    } as any
  });

export default i18n;
