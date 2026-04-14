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
    heading1: {
      apply: "Apply Heading",
      remove: "Remove Heading",
      label: "Heading",
      shortcut: shortcuts.heading1,
    },
    heading2: {
      apply: "Apply Subheading",
      remove: "Remove Subheading",
      label: "Subheading",
      shortcut: shortcuts.heading2,
    },
    variable: {
      apply: "Apply Variable",
      remove: "Remove Variable",
      label: "Variable",
      shortcut: shortcuts.variable,
    },
    bold: {
      apply: "Apply Bold",
      remove: "Remove Bold",
      label: "Bold",
      shortcut: shortcuts.bold,
    },
    italic: {
      apply: "Apply Italic",
      remove: "Remove Italic",
      label: "Italic",
      shortcut: shortcuts.italic,
    },
    bulletList: {
      apply: "Apply Bulleted List",
      remove: "Remove Bulleted List",
      label: "Bulleted List",
      shortcut: shortcuts.bulletList,
    },
    numberedList: {
      apply: "Apply Numbered List",
      remove: "Remove Numbered List",
      label: "Numbered List",
      shortcut: shortcuts.numberedList,
    },
    link: {
      apply: "Apply Link",
      remove: "Remove Link",
      label: "Link",
      shortcut: shortcuts.link,
    },
    horizontalRule: {
      applied: "inserted.",
      apply: "Insert Section Break",
      remove: "Remove Section Break",
      label: "Section break",
      shortcut: shortcuts.horizontalRule,
    },
    blockquote: {
      apply: "Apply Blockquote",
      remove: "Remove Blockquote",
      label: "Blockquote",
      shortcut: shortcuts.blockquote,
    },
    englishBlock: {
      apply: "Apply English content",
      remove: "Remove English content",
      label: "English content",
    },
    frenchBlock: {
      apply: "Apply French content",
      remove: "Remove French content",
      label: "French content",
    },
    conditionalBlock: {
      apply: "Apply Conditional section",
      remove: "Remove Conditional section",
      label: "Conditional section",
    },
    conditionalInline: {
      apply: "Apply Conditional text",
      remove: "Remove Conditional text",
      label: "Conditional text",
    },
    conditional: {
      apply: "Apply Conditional",
      remove: "Remove Conditional",
      label: "Conditional",
    },
    rtlBlock: {
      apply: "Apply Right-to-left text",
      remove: "Remove Right-to-left text",
      label: "Right-to-left text",
      shortcut: shortcuts.rtlBlock,
    },
    infoPane1: "Focus on a button for its function and shortcut. ",
    infoPane2: "Custom content",
    infoPane3: "Conditional content:",
    infoPane4: "Within a paragraph",
    infoPane5: "As a separate section",
    info: { apply: "Help", remove: "Help", label: "Help" },
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
    heading1: {
      apply: "Appliquer Titre",
      remove: "Supprimer Titre",
      label: "Titre",
      shortcut: shortcuts.heading1,
    },
    heading2: {
      apply: "Appliquer Sous titre",
      remove: "Supprimer Sous titre",
      label: "Sous titre",
      shortcut: shortcuts.heading2,
    },
    variable: {
      apply: "Appliquer Variable",
      remove: "Supprimer Variable",
      label: "Variable",
      shortcut: shortcuts.variable,
    },
    bold: {
      apply: "Appliquer Gras",
      remove: "Supprimer Gras",
      label: "Gras",
      shortcut: shortcuts.bold,
    },
    italic: {
      apply: "Appliquer Italique",
      remove: "Supprimer Italique",
      label: "Italique",
      shortcut: shortcuts.italic,
    },
    bulletList: {
      apply: "Appliquer Liste à puces",
      remove: "Supprimer Liste à puces",
      label: "Liste à puces",
      shortcut: shortcuts.bulletList,
    },
    numberedList: {
      apply: "Appliquer Liste numérotée",
      remove: "Supprimer Liste numérotée",
      label: "Liste numérotée",
      shortcut: shortcuts.numberedList,
    },
    link: {
      apply: "Appliquer Lien",
      remove: "Supprimer Lien",
      label: "Lien",
      shortcut: shortcuts.link,
    },
    horizontalRule: {
      applied: "inséré.",
      apply: "Insérer un saut de section",
      remove: "Supprimer le saut de section",
      label: "Saut de section",
      shortcut: shortcuts.horizontalRuleFR,
    },
    blockquote: {
      apply: "Appliquer Bloc en retrait",
      remove: "Supprimer Bloc en retrait",
      label: "Bloc en retrait",
      shortcut: shortcuts.blockquote,
    },
    englishBlock: {
      apply: "Appliquer Contenu en anglais",
      remove: "Supprimer Contenu en anglais",
      label: "Contenu en anglais",
    },
    frenchBlock: {
      apply: "Appliquer Contenu en français",
      remove: "Supprimer Contenu en français",
      label: "Contenu en français",
    },
    conditionalBlock: {
      apply: "Appliquer Section conditionnelle",
      remove: "Supprimer Section conditionnelle",
      label: "Section conditionnelle",
    },
    conditionalInline: {
      apply: "Appliquer Texte conditionnel",
      remove: "Supprimer Texte conditionnel",
      label: "Texte conditionnel",
    },
    conditional: {
      apply: "Appliquer Conditionnel",
      remove: "Supprimer Conditionnel",
      label: "Conditionnel",
    },
    rtlBlock: {
      apply: "Appliquer Afficher de droite à gauche",
      remove: "Supprimer Afficher de droite à gauche",
      label: "Afficher de droite à gauche",
      shortcut: shortcuts.rtlBlock,
    },
    infoPane1:
      "Sélectionnez un bouton pour découvrir sa fonction et son raccourci.",
    infoPane2: "Contenu personnalisé",
    infoPane3: "Contenu conditionnel :",
    infoPane4: "À l'intérieur d'un paragraphe",
    infoPane5: "Section entière",
    info: { apply: "Aide", remove: "Aide", label: "Aide" },
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
