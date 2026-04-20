const getPlatform = () => {
  if (typeof window === "undefined" || !window.navigator) return "pc";
  const platform = window.navigator.platform.toLowerCase();
  if (platform.includes("mac")) return "mac";
  return "pc";
};

const platform = getPlatform();

const shortcuts = {
  heading1: platform === "mac" ? "⌘+Opt+1" : "Ctrl+Alt+1",
  heading2: platform === "mac" ? "⌘+Opt+2" : "Ctrl+Alt+2",
  variable: platform === "mac" ? "⌘+Shift+U" : "Ctrl+Shift+U",
  bulletList: platform === "mac" ? "⌘+Shift+8" : "Ctrl+Shift+8",
  numberedList: platform === "mac" ? "⌘+Shift+7" : "Ctrl+Shift+7",
  horizontalRule: platform === "mac" ? "⌘+Enter" : "Ctrl+Enter",
  horizontalRuleFR: platform === "mac" ? "⌘+Retour" : "Ctrl+Retour",
  blockquote: platform === "mac" ? "⌘+Shift+9" : "Ctrl+Shift+9",
  rtlBlock: platform === "mac" ? "⌘+Opt+R" : "Ctrl+Alt+R",
  link: platform === "mac" ? "⌘+K" : "Ctrl+K",
  bold: platform === "mac" ? "⌘+B" : "Ctrl+B",
  italic: platform === "mac" ? "⌘+I" : "Ctrl+I",
};

export const translations = {
  en: {
    // Shared
    noShortcut: "No shortcut",

    // MenuBar
    toolbar: "Editor toolbar",
    toggleMd: "View source",
    linkDialogOpened: "Link dialog opened",
    applied: "applied.",
    removed: "removed.",
    verbs: { apply: "Apply", insert: "Insert", remove: "Remove" },
    heading1: {
      label: "Heading",
      shortcut: shortcuts.heading1,
    },
    heading2: {
      label: "Subheading",
      shortcut: shortcuts.heading2,
    },
    variable: {
      label: "Variable",
      shortcut: shortcuts.variable,
    },
    bold: {
      label: "Bold",
      shortcut: shortcuts.bold,
    },
    italic: {
      label: "Italic",
      shortcut: shortcuts.italic,
    },
    bulletList: {
      label: "Bulleted List",
      shortcut: shortcuts.bulletList,
    },
    numberedList: {
      label: "Numbered List",
      shortcut: shortcuts.numberedList,
    },
    link: {
      label: "Link",
      shortcut: shortcuts.link,
    },
    horizontalRule: {
      applied: "inserted.",
      verb: "insert",
      label: "Section break",
      shortcut: shortcuts.horizontalRule,
    },
    blockquote: {
      label: "Blockquote",
      shortcut: shortcuts.blockquote,
    },
    englishBlock: {
      label: "English content",
    },
    frenchBlock: {
      label: "French content",
    },
    conditionalBlock: {
      label: "Conditional section",
    },
    conditionalInline: {
      label: "Conditional text",
    },
    conditional: {
      label: "Conditional",
    },
    rtlBlock: {
      label: "Right-to-left text",
      shortcut: shortcuts.rtlBlock,
    },
    ariaDescriptions: {
      heading1: "Heading level 1",
      heading2: "Heading level 2",
      bulletList: "Bulleted list",
      numberedList: "Numbered list",
      bold: "Bold",
      italic: "Italic",
      horizontalRule: "Section break",
      blockquote: "Blockquote",
      variable: "Variable",
      englishBlock: "English content",
      frenchBlock: "French content",
      conditionalBlock: "Conditional section",
      conditionalInline: "Conditional text",
    },
    infoPane1: "Focus on a button for its function and shortcut. ",
    infoPane2: "Custom content",
    infoPane3: "Conditional content:",
    infoPane4: "Within a paragraph",
    infoPane5: "As a separate section",
    info: "Help",
    markdownButton: "Back to the markdown editor",
    richTextButton: "Try toolbar formatting",
    markdownEditorMessage: "New email experience",

    // LinkModal
    enterLink: "Enter URL",
    placeholder: "URL",
    save: "Apply link",
    goTo: "Visit link",
    remove: "Unlink",
  },
  fr: {
    // Shared
    noShortcut: "Aucun raccourci",

    // MenuBar
    toolbar: "Barre d'outils de l'éditeur",
    toggleMd: "Voir la source",
    linkDialogOpened: "Boîte de dialogue du lien ouverte",
    applied: "appliqué.",
    removed: "supprimé.",
    verbs: { apply: "Appliquer", insert: "Insérer", remove: "Supprimer" },
    heading1: {
      label: "Titre",
      shortcut: shortcuts.heading1,
    },
    heading2: {
      label: "Sous titre",
      shortcut: shortcuts.heading2,
    },
    variable: {
      label: "Variable",
      shortcut: shortcuts.variable,
    },
    bold: {
      label: "Gras",
      shortcut: shortcuts.bold,
    },
    italic: {
      label: "Italique",
      shortcut: shortcuts.italic,
    },
    bulletList: {
      label: "Liste à puces",
      shortcut: shortcuts.bulletList,
    },
    numberedList: {
      label: "Liste numérotée",
      shortcut: shortcuts.numberedList,
    },
    link: {
      label: "Lien",
      shortcut: shortcuts.link,
    },
    horizontalRule: {
      applied: "inséré.",
      verb: "insert",
      label: "Saut de section",
      shortcut: shortcuts.horizontalRuleFR,
    },
    blockquote: {
      label: "Bloc en retrait",
      shortcut: shortcuts.blockquote,
    },
    englishBlock: {
      label: "Contenu en anglais",
    },
    frenchBlock: {
      label: "Contenu en français",
    },
    conditionalBlock: {
      label: "Section conditionnelle",
    },
    conditionalInline: {
      label: "Texte conditionnel",
    },
    conditional: {
      label: "Conditionnel",
    },
    rtlBlock: {
      label: "Afficher de droite à gauche",
      shortcut: shortcuts.rtlBlock,
    },
    ariaDescriptions: {
      heading1: "Titre de niveau 1",
      heading2: "Titre de niveau 2",
      bulletList: "Liste à puces",
      numberedList: "Liste numérotée",
      bold: "Gras",
      italic: "Italique",
      horizontalRule: "Saut de section",
      blockquote: "Bloc en retrait",
      variable: "Variable",
      englishBlock: "Contenu en anglais",
      frenchBlock: "Contenu en français",
      conditionalBlock: "Section conditionnelle",
      conditionalInline: "Texte conditionnel",
    },
    infoPane1:
      "Sélectionnez un bouton pour découvrir sa fonction et son raccourci.",
    infoPane2: "Contenu personnalisé",
    infoPane3: "Contenu conditionnel :",
    infoPane4: "À l'intérieur d'un paragraphe",
    infoPane5: "Section entière",
    info: "Aide",
    markdownButton: "Retour à l'éditeur de markdown",
    richTextButton: "Essayez les outils de mise en forme",
    markdownEditorMessage: "Nouvelle expérience courriel",

    // LinkModal
    enterLink: "Entrez l'URL",
    placeholder: "URL",
    save: "Appliquer le lien",
    goTo: "Visiter le lien",
    remove: "Effacer le lien",
  },
};

export const getNoShortcutLabel = (lang = "en") => {
  return translations[lang]?.noShortcut || translations.en.noShortcut;
};
