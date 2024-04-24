import React, { useReducer } from "react";

import { EN } from "./locales/en";
import { FR } from "./locales/fr";

const translations = {
  en: EN,
  fr: FR,
};

const LANGUAGES = ["en", "fr"]; // en
const LOCALE = window.APP_LANG === "en" ? LANGUAGES[0] : LANGUAGES[1];

export const getTranslate = (langCode) => (key) =>
  translations[langCode][key] || key;

const initialState = {
  langCode: LOCALE,
  translate: getTranslate(LOCALE),
};

export const I18nContext = React.createContext(initialState);

export const I18nProvider = ({ value = {}, children }) => {
  const mergedState = { ...initialState, ...value };
  const reducer = (state, action) => {
    switch (action.type) {
      case "setLanguage":
        return {
          langCode: action.payload,
          translate: getTranslate(action.payload),
        };
      default:
        return state;
    }
  };

  const [state, dispatch] = useReducer(reducer, mergedState);

  return (
    <I18nContext.Provider value={{ ...state, dispatch }}>
      {children}
    </I18nContext.Provider>
  );
};
