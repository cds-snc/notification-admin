import React, { createContext, useContext } from "react";
import { translations } from "./localization";

const EditorContext = createContext({
  lang: "en",
  t: translations.en,
});

export const EditorProvider = ({ lang, children }) => {
  const t = translations[lang] || translations.en;
  return (
    <EditorContext.Provider value={{ lang, t }}>
      {children}
    </EditorContext.Provider>
  );
};

export const useEditorContext = () => useContext(EditorContext);
