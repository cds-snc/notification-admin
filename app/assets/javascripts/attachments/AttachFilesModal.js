import React, { useEffect, useRef, useState } from "react";
// Render inline as an expanding panel instead of a portal/modal
import { ACCEPT_ATTRIBUTE } from "./useAttachments";
import { getAttachmentTranslations } from "./localization";

const DEFAULT_COPY = getAttachmentTranslations("en");

export const AttachFilesModal = ({
  isOpen,
  issues,
  copy = DEFAULT_COPY,
  classificationUrl = "#",
  onClose,
  onAttach,
}) => {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isAnimatingOpen, setIsAnimatingOpen] = useState(false);
  const dialogRef = useRef(null);
  const previouslyFocusedElement = useRef(null);
  const previousBodyOverflow = useRef("");

  useEffect(() => {
    if (isOpen) {
      setSelectedFiles([]);
      // trigger open animation on next tick
      setTimeout(() => setIsAnimatingOpen(true), 10);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setIsAnimatingOpen(false);
      return undefined;
    }

    previouslyFocusedElement.current = document.activeElement;

    const dialogElement = dialogRef.current;
    const getFocusableElements = () => {
      if (!dialogElement) {
        return [];
      }

      return Array.from(
        dialogElement.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => !element.hasAttribute("disabled"));
      };
      

    const focusableElements = getFocusableElements();
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const activeFocusableElements = getFocusableElements();
      if (!activeFocusableElements.length) {
        return;
      }

      const first = activeFocusableElements[0];
      const last = activeFocusableElements[activeFocusableElements.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);

      if (
        previouslyFocusedElement.current &&
        previouslyFocusedElement.current.focus
      ) {
        previouslyFocusedElement.current.focus();
      }
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const onChange = (event) => {
    const files = Array.from(event.target.files || []);
    const normalizedFiles = files.map((file, index) => ({
      id: `${file.name}-${file.size}-${file.lastModified || 0}-${index}`,
      file,
    }));
    setSelectedFiles(normalizedFiles);
  };

  const onRemovePending = (fileId) => {
    setSelectedFiles((currentFiles) =>
      currentFiles.filter((pendingFile) => pendingFile.id !== fileId),
    );
  };

  const submit = () => {
    onAttach(selectedFiles.map((pendingFile) => pendingFile.file));
  };

  return (
    <div
      ref={dialogRef}
      tabIndex="-1"
      role="region"
      aria-labelledby="attachments-modal-title"
      data-testid="attachments-panel"
      className={`bg-white w-full max-w-[720px] p-6 shadow-sm text-base mt-4 attachments-panel border border-gray-300 ${
        isAnimatingOpen ? "attachments-panel--open" : ""
      }`}
    >
      <h2 id="attachments-modal-title" className="heading-large mb-4">
        {copy.modalTitle}
      </h2>
      <p>{copy.modalIntro}</p>
      <p>
        {copy.modalClassificationPrefix}{" "}
        <a href={classificationUrl}>{copy.modalClassificationLinkText}</a>.
      </p>

      <ul className="list list-bullet ml-5">
        <li>{copy.modalAttachedFilesCanBe}</li>
        <li>{copy.modalTextDocuments}</li>
        <li>{copy.modalDataDocuments}</li>
        <li>{copy.modalImageDocuments}</li>
      </ul>

      <div className="border-l-4 border-gray-300 mb-4">
        <label className="file-field pl-4 py-2 block mb-4">
          <span className="button button-secondary">
            {copy.modalChooseFiles}
          </span>
          <input
            type="file"
            multiple
            accept={ACCEPT_ATTRIBUTE}
            className="hidden"
            data-testid="attachments-file-input"
            onChange={onChange}
          />
        </label>

        <p className="mb-2 pl-4">
          {selectedFiles.length
            ? copy.modalFilesSelected(selectedFiles.length)
            : copy.modalNoFilesSelected}
        </p>
      </div>
      {selectedFiles.length > 0 && (
        <ul className="space-y-2 mb-4" data-testid="pending-files-list">
          {selectedFiles.map((pendingFile) => (
            <li
              key={pendingFile.id}
              className="border border-gray-300 p-3 flex justify-between items-center align-middle"
            >
              <span
                className="attachment-file-name-truncate min-w-0 pr-4 mb-0"
                title={pendingFile.file.name}
              >
                {pendingFile.file.name}
              </span>
              <button
                className="link text-red-700"
                type="button"
                data-testid="attachments-pending-remove"
                onClick={() => onRemovePending(pendingFile.id)}
              >
                <span className="font-bold underline">{copy.remove}</span>
                <span aria-hidden="true">&nbsp;×</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {issues.length > 0 && (
        <div
          className="banner-dangerous p-4 mb-4"
          role="alert"
          data-testid="attach-validation-errors"
        >
          <ul className="list list-bullet">
            {issues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-10">{copy.modalScanNotice}</p>

      <div className="flex gap-4 items-center">
        <button
          type="button"
          className="button"
          data-testid="attachments-submit"
          onClick={submit}
        >
          {copy.modalAttachToTemplate}
        </button>
        <button
          type="button"
          className="button button-secondary text-base"
          data-testid="attachments-cancel"
          onClick={onClose}
        >
          {copy.cancel}
        </button>
      </div>
    </div>
  );
};
