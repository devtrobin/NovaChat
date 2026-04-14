import i18next, { type i18n as I18nInstance } from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./locales/en.json";
import fr from "./locales/fr.json";

const rawLanguage = navigator.language?.toLowerCase() ?? "en";
const initialLanguage = rawLanguage.startsWith("fr") ? "fr" : "en";
const i18n: I18nInstance = i18next;

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    fr: { translation: fr },
  },
  lng: initialLanguage,
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

export default i18n;
