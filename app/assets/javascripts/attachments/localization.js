const en = {
  warningTitle: "Some files are not yet attached",
  warningBody: "GC Notify is still scanning your files.",
  continue: "Continue",
  back: "Back",
  attachedFilesHeading: "Attached files",
  attachFiles: "Attach files",
  attachMoreFiles: "Attach more files",
  noFilesAttached: "No files attached",

  chooseUpToFiles: (count) => `Choose up to ${count} files.`,
  maxCombinedSize: "Maximum 6 MB for all files combined.",
  unsupportedType: (name) => `${name} has an unsupported file type.`,
  filenameNoParentheses: (name) => `${name} cannot contain parentheses.`,
  summaryUploading: (count) =>
    `${count} ${count === 1 ? "file" : "files"} uploading`,
  summaryScanning: (count) =>
    `${count} ${count === 1 ? "file" : "files"} scanning`,
  summaryAttached: (count) =>
    `${count} ${count === 1 ? "file" : "files"} attached`,
  summaryNotAttached: (count) =>
    `${count} ${count === 1 ? "file" : "files"} not attached`,

  modalTitle: "Attach files",
  modalIntro: "Choose up to 10 files. Maximum 6 MB for all files combined.",
  modalClassificationPrefix: "Only send files with",
  modalClassificationLinkText:
    "non-emergency, unclassified or Protected A information",
  modalAttachedFilesCanBe: "Attached files can be:",
  modalTextDocuments: "Text documents (.pdf, .doc, .docx, .odt, .rtf, .txt)",
  modalDataDocuments: "Spreadsheets and data (.xlsx, .csv, .json)",
  modalImageDocuments: "Images (.jpeg, .jpg, .png)",
  modalChooseFiles: "Choose files",
  modalNoFilesSelected: "No files selected",
  modalFilesSelected: (count) =>
    `${count} file${count === 1 ? "" : "s"} selected`,
  remove: "Remove",
  modalScanNotice:
    "GC Notify scans your files after you attach them to this template.",
  modalAttachToTemplate: "Attach to template",
  cancel: "Cancel",

  malwareMessage: "This file is unsafe and was not attached.",
  removeConfirmTitle: "Are you sure you want to remove this file?",
  removeConfirmBodyPrefix: "Download a copy of",
  removeConfirmBodySuffix: "if you think you might need it later.",
  yesRemoveFile: "Yes, remove file",
  rowSpinnerAriaLabel: "File upload in progress",
};

const fr = {
  warningTitle: "Certains fichiers ne sont pas encore joints",
  warningBody: "GC Notify analyse toujours vos fichiers.",
  continue: "Continuer",
  back: "Retour",
  attachedFilesHeading: "Fichiers joints",
  attachFiles: "Joindre des fichiers",
  attachMoreFiles: "Joindre d'autres fichiers",
  noFilesAttached: "Aucun fichier joint",

  chooseUpToFiles: (count) => `Choisissez jusqu'à ${count} fichiers.`,
  maxCombinedSize: "Maximum 6 Mo pour tous les fichiers combinés.",
  unsupportedType: (name) => `${name} a un type de fichier non pris en charge.`,
  filenameNoParentheses: (name) =>
    `${name} ne peut pas contenir de parenthèses.`,
  summaryUploading: (count) =>
    `${count} ${count === 1 ? "fichier" : "fichiers"} en préparation`,
  summaryScanning: (count) =>
    `${count} ${count === 1 ? "fichier" : "fichiers"} en préparation`,
  summaryAttached: (count) =>
    `${count} ${count === 1 ? "fichier" : "fichiers"} joints`,
  summaryNotAttached: (count) =>
    `${count} ${count === 1 ? "fichier non-joint" : "fichiers non-joints"}`,

  modalTitle: "Joindre des fichiers",
  modalIntro:
    "Choisissez jusqu'à 10 fichiers. Maximum 6 Mo pour tous les fichiers combinés.",
  modalClassificationPrefix: "Les fichiers joints ne doivent contenir que des",
  modalClassificationLinkText:
    "renseignements non urgents, non classifiés ou de niveau protégé A",
  modalAttachedFilesCanBe: "Les fichiers joints sont des:",
  modalTextDocuments: "Documents texte (.pdf, .doc, .docx, .odt, .rtf, .txt)",
  modalDataDocuments: "Feuilles de calcul et données (.xlsx, .csv, .json)",
  modalImageDocuments: "Images (.jpeg, .jpg, .png)",
  modalChooseFiles: "Choisir des fichiers",
  modalNoFilesSelected: "Aucun fichier sélectionné",
  modalFilesSelected: (count) =>
    `${count} fichier${count === 1 ? "" : "s"} sélectionné${count === 1 ? "" : "s"}`,
  remove: "Supprimer",
  modalScanNotice:
    "Notification GC analyse vos fichiers après que vous les aurez joints au gabarit.",
  modalAttachToTemplate: "Joindre au gabarit",
  cancel: "Annuler",

  malwareMessage: "Ce fichier n'est pas sûr et n'a pas été joint.",
  removeConfirmTitle: "Voulez-vous vraiment supprimer ce fichier?",
  removeConfirmBodyPrefix: "Télécharger une copie de",
  removeConfirmBodySuffix: "si vous pensez en avoir besoin plus tard.",
  yesRemoveFile: "Oui, supprimer le fichier",
  rowSpinnerAriaLabel: "Fichier en préparation",
};

export const getAttachmentTranslations = (lang = "en") => {
  return lang === "fr" ? fr : en;
};
