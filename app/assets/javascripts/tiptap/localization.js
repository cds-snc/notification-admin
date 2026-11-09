const getPlatform = () => {
  if (typeof window === "undefined" || !window.navigator) return "pc";
  const platform = window.navigator.platform.toLowerCase();
  if (platform.includes("mac")) return "mac";
  return "pc";
};

const platform = getPlatform();

export const shortcuts = {
  heading1: platform === "mac" ? "⌘+Opt+1" : "Ctrl+Alt+1",
  heading2: platform === "mac" ? "⌘+Opt+2" : "Ctrl+Alt+2",
  variable: platform === "mac" ? "⌘+Shift+U" : "Ctrl+Shift+U",
  bulletList: platform === "mac" ? "⌘+Shift+8" : "Ctrl+Shift+8",
  orderedList: platform === "mac" ? "⌘+Shift+7" : "Ctrl+Shift+7",
  horizontalRule: platform === "mac" ? "⌘+Enter" : "Ctrl+Enter",
  horizontalRuleFR: platform === "mac" ? "⌘+Retour" : "Ctrl+Retour",
  blockquote: platform === "mac" ? "⌘+Shift+9" : "Ctrl+Shift+9",
  rtlBlock: platform === "mac" ? "⌘+Opt+R" : "Ctrl+Alt+R",
  link: platform === "mac" ? "⌘+K" : "Ctrl+K",
  bold: platform === "mac" ? "⌘+B" : "Ctrl+B",
  italic: platform === "mac" ? "⌘+I" : "Ctrl+I",
  // KeyboardEvent uses Alt for the Option key on macOS.
  toolbarFocusAria: "Alt+F10",
  toolbarFocusDisplay: platform === "mac" ? "Opt+F10" : "Alt+F10",
};

export const translations = {
  en: {
    // Shared
    noShortcut: "No shortcut",

    // MenuBar
    toolbar: "Editor toolbar",
    toolbarShortcutHintTemplate: "Toolbar shortcut: {shortcut}",
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
    orderedList: {
      label: "Numbered List",
      shortcut: shortcuts.orderedList,
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
    infoPane1: {
      label: "Custom content",
      title: "Enter custom content",
      p1: "You can fill messages with details such as each recipient’s name, birthdate, application number, appointment time and custom link. Use toolbar button: ",
      p2: "You can use spreadsheets to send individual details to multiple recipients. Details in Using a spreadsheet.",
      p1Icon: "Variable icon",
      title2: "Filter content to a subset of recipients",
      p3: "You can filter content:",
      li1: "To specific recipients. Recipients receive these details if they meet a condition, for example, if they’re over 18",
      li2: "Within a paragraph:",
      li2Icon: "Inline conditional icon",
      li3: "As a separate section:",
      li3Icon: "Block conditional icon",
    },
    infoPane2: {
      label: "Multiple languages",
      title: "Multiple languages",
      p1: "You can:",
      li1: "Ensure screen readers use correct pronunciation in bilingual messages. On the line before English or French text, select the correct toolbar button:",
      li1Icon1: "English block icon",
      li1or: "or",
      li1Icon2: "French block icon",
      li2: "Display languages read from right to left, using the button:",
      li2Icon: "Right-to-left icon",
    },
    infoPane3: {
      label: "Email links",
      title: "Email links",
      p1: "You can set links to open a blank email message in a recipient inbox.  You choose the email address that’s inside the “To” line.",
      p2: "Enter:",
      li1: "Text such as “Email us”.",
      li2: "Select that text and open the link function on the toolbar.",
      li3: "Enter “mailto:” and then the email address.",
    },
    infoTabsLabel: "Help topics",
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
    toolbarShortcutHintTemplate:
      "Raccourci pour atteindre la barre d'outils : {shortcut}",
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
    orderedList: {
      label: "Liste numérotée",
      shortcut: shortcuts.orderedList,
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
    infoPane1: {
      label: "Contenu personnalisé",
      title: "Saisie de contenu personnalisé ",
      p1: "Vous pouvez remplir les messages avec des données telles que le nom de chaque destinataire, la date de naissance, le numéro de demande, l’heure du rendez-vous et un lien personnalisé. Utilisez le bouton de la barre d’outils : ",
      p2: "Vous pouvez utiliser des feuilles de calcul pour envoyer des données individualisées à plusieurs destinataires. Consultez la section Utiliser une feuille de calcul. ",
      p1Icon: "Icone pour Variable",
      title2: "Filtrer le contenu pour un sous-ensemble de destinataires ",
      p3: "Vous pouvez filtrer le contenu : ",
      li1: "Pour des destinataires spécifiques. Les destinataires reçoivent ces données s’ils répondent à une condition, par exemple s’ils ont plus de 18 ans ",
      li2: "Dans un paragraphe : ",
      li2Icon: "Icone pour texte conditionnel",
      li3: "Comme une section distincte :",
      li3Icon: "Icone pour section conditionnelle",
    },
    infoPane2: {
      label: "Langues multiples",
      title: "Langues multiples",
      p1: "Vous pouvez : ",
      li1: "Faire en sorte que le lecteur d’écran prononce correctement les messages bilingues. Sur la ligne qui précède le texte anglais ou français, sélectionnez le bon bouton de la barre d’outils : ",
      li1Icon1: "Icone pour contenu en anglais",
      li1or: "ou",
      li1Icon2: "Icone pour contenu en français",
      li2: "Afficher les langues qui se lisent de droite à gauche à l’aide du bouton :",
      li2Icon: "Icone pour texte de droite à gauche",
    },
    infoPane3: {
      label: "Liens d’envoi de courriel",
      title: "Liens d’envoi de courriel",
      p1: "Vous pouvez configurer des liens pour ouvrir un courriel vide dans la boîte de réception d’un destinataire. Vous choisissez l’adresse courriel qui s’inscrit à la ligne du destinataire. ",
      p2: "Saisissez :",
      li1: "Du texte comme « Envoyez-nous un courriel ».",
      li2: "Sélectionnez ce texte et ouvrez la fonction de lien dans la barre d’outils.",
      li3: "Saisissez « mailto: » puis l’adresse courriel.",
    },
    infoTabsLabel: "Rubriques d'aide",
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
