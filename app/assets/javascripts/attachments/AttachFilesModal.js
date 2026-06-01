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
  onIssuesChange,
  onValidateSelection,
  onClose,
  onAttach,
}) => {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isAnimatingOpen, setIsAnimatingOpen] = useState(false);
  const dialogRef = useRef(null);
  const headingRef = useRef(null);
  const previouslyFocusedElement = useRef(null);

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

    if (headingRef.current && headingRef.current.focus) {
      headingRef.current.focus();
    }

    return () => {
      if (
        previouslyFocusedElement.current &&
        previouslyFocusedElement.current.focus
      ) {
        previouslyFocusedElement.current.focus();
      }
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen || !isAnimatingOpen || !dialogRef.current) {
      return undefined;
    }

    const panel = dialogRef.current;
    let frameId;
    const startTime = performance.now();
    const maxFollowDurationMs = 1400;
    let stableFrames = 0;

    // Keep the expanding panel in view while max-height animation runs.
    const scrollWithAnimation = () => {
      if (!panel.isConnected) {
        return;
      }

      const rect = panel.getBoundingClientRect();
      const viewportPadding = 16;
      const bottomOverflow = rect.bottom - window.innerHeight + viewportPadding;

      if (bottomOverflow > 0) {
        stableFrames = 0;
        const step = Math.min(48, Math.max(14, bottomOverflow * 0.35));
        window.scrollBy({
          top: step,
          behavior: "auto",
        });
      } else {
        stableFrames += 1;
      }

      if (
        performance.now() - startTime < maxFollowDurationMs &&
        stableFrames < 2
      ) {
        frameId = window.requestAnimationFrame(scrollWithAnimation);
      }
    };

    frameId = window.requestAnimationFrame(scrollWithAnimation);

    return () => {
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, [isOpen, isAnimatingOpen]);

  if (!isOpen) {
    return null;
  }

  const onChange = (event) => {
    const files = Array.from(event.target.files || []);
    const validation = onValidateSelection
      ? onValidateSelection(files)
      : { acceptedFiles: files, issues: [] };

    if (typeof onIssuesChange === "function") {
      onIssuesChange(validation.issues);
    }

    const normalizedFiles = validation.acceptedFiles.map((file, index) => ({
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

  const onPanelKeyDown = (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
    }
  };

  return (
    <div
      ref={dialogRef}
      tabIndex="-1"
      role="region"
      aria-labelledby="attachments-modal-title"
      data-testid="attachments-panel"
      onKeyDown={onPanelKeyDown}
      className={`bg-white w-full max-w-[720px] p-6 shadow-sm text-base mt-4 attachments-panel border border-gray-300 ${
        isAnimatingOpen ? "attachments-panel--open" : ""
      }`}
    >
      <h2
        ref={headingRef}
        id="attachments-modal-title"
        className="heading-large mb-4"
        tabIndex="-1"
      >
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

      <div className="file-upload-group relative inline-flex flex-col gap-2 items-start mb-4">
        <input
          id="attachments-file-input"
          type="file"
          name="attachments"
          multiple
          accept={ACCEPT_ATTRIBUTE}
          className="file-upload-field"
          data-testid="attachments-file-input"
          onChange={onChange}
        />
        <label
          htmlFor="attachments-file-input"
          className="file-upload-button button button-secondary"
        >
          {copy.modalChooseFiles}
        </label>

        <p className="mb-2">
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
              className="border border-gray-300 p-3 flex justify-between items-start align-top"
            >
              <div className="min-w-0 pr-4">
                <span
                  className="attachment-file-name-truncate mb-0 block"
                  title={pendingFile.file.name}
                >
                  {pendingFile.file.name}
                </span>
              </div>
              <button
                className="link text-red-700 self-start"
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
