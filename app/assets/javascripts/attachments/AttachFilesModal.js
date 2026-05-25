import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
    const dialogRef = useRef(null);
    const previouslyFocusedElement = useRef(null);

    useEffect(() => {
        if (isOpen) {
            setSelectedFiles([]);
        }
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) {
            return undefined;
        }

        previouslyFocusedElement.current = document.activeElement;
        document.body.style.overflow = "hidden";

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

        const keepFocusInsideDialog = (event) => {
            if (!dialogElement) {
                return;
            }

            if (dialogElement.contains(event.target)) {
                return;
            }

            event.preventDefault();
            const activeFocusableElements = getFocusableElements();
            if (activeFocusableElements.length > 0) {
                activeFocusableElements[0].focus();
            } else {
                dialogElement.focus();
            }
        };

        const blockPointerOutsideDialog = (event) => {
            if (!dialogElement) {
                return;
            }

            if (dialogElement.contains(event.target)) {
                return;
            }

            event.preventDefault();
            event.stopPropagation();
        };

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
        document.addEventListener("focusin", keepFocusInsideDialog, true);
        document.addEventListener("pointerdown", blockPointerOutsideDialog, true);

        return () => {
            document.removeEventListener("keydown", onKeyDown);
            document.removeEventListener("focusin", keepFocusInsideDialog, true);
            document.removeEventListener("pointerdown", blockPointerOutsideDialog, true);
            document.body.style.overflow = "";

            if (previouslyFocusedElement.current && previouslyFocusedElement.current.focus) {
                previouslyFocusedElement.current.focus();
            }
        };
    }, [isOpen, onClose]);

    if (!isOpen) {
        return null;
    }

    const onChange = (event) => {
        const files = Array.from(event.target.files || []);
        setSelectedFiles(files);
    };

    const onRemovePending = (name) => {
        setSelectedFiles((currentFiles) => currentFiles.filter((file) => file.name !== name));
    };

    const submit = () => {
        onAttach(selectedFiles);
    };

    return createPortal(
        <div className="fixed inset-0 bg-gray-900/40 z-30" role="dialog" aria-modal="true" aria-labelledby="attachments-modal-title" data-testid="attachments-modal">
            <div
                ref={dialogRef}
                tabIndex="-1"
                className="bg-white w-[95%] max-w-[720px] mx-auto mt-16 p-8 border border-gray-300 shadow-lg"
            >
                <h2 id="attachments-modal-title" className="heading-large mb-4">{copy.modalTitle}</h2>
                <p>{copy.modalIntro}</p>
                <p>
                    {copy.modalClassificationPrefix}
                    {" "}
                    <a href={classificationUrl}>
                        {copy.modalClassificationLinkText}
                    </a>
                    .
                </p>

                <p>
                    {copy.modalAttachedFilesCanBe}
                    <br />{copy.modalTextDocuments}
                    <br />{copy.modalDataDocuments}
                    <br />{copy.modalImageDocuments}
                </p>

                <div className="border-l-4 border-blue-700 mb-4">
                    <label className="file-field pl-4 py-2 block mb-4">
                        <span className="button button-secondary">{copy.modalChooseFiles}</span>
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
                        {selectedFiles.length ? copy.modalFilesSelected(selectedFiles.length) : copy.modalNoFilesSelected}
                    </p>
                </div>
                {selectedFiles.length > 0 && (
                    <ul className="space-y-2 mb-4" data-testid="pending-files-list">
                        {selectedFiles.map((file) => (
                            <li key={file.name} className="border border-gray-300 p-3 flex justify-between items-center align-middle">
                                <span
                                    className="min-w-0 pr-4 mb-0"
                                    title={file.name}
                                    style={{
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        whiteSpace: "nowrap",
                                    }}
                                >
                                    {file.name}
                                </span>
                                <button
                                    className="link text-red-700"
                                    type="button"
                                    data-testid="attachments-pending-remove"
                                    onClick={() => onRemovePending(file.name)}
                                >
                                    <span className="font-bold underline">{copy.remove}</span>
                                    <span aria-hidden="true">&nbsp;×</span>
                                </button>
                            </li>
                        ))}
                    </ul>
                )}

                {issues.length > 0 && (
                    <div className="banner-dangerous p-4 mb-4" role="alert" data-testid="attach-validation-errors">
                        <ul className="list list-bullet">
                            {issues.map((issue) => (
                                <li key={issue}>{issue}</li>
                            ))}
                        </ul>
                    </div>
                )}

                <p className="mt-10">{copy.modalScanNotice}</p>

                <div className="flex gap-4 items-center">
                    <button type="button" className="button" data-testid="attachments-submit" onClick={submit}>{copy.modalAttachToTemplate}</button>
                    <button type="button" className="button button-secondary" data-testid="attachments-cancel" onClick={onClose}>{copy.cancel}</button>
                </div>
            </div>
        </div>,
        document.body,
    );
};
