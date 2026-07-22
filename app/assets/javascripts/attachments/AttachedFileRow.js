import React, { useEffect, useRef } from "react";
import { ATTACHMENT_STATUSES } from "./useAttachments";
import { getAttachmentTranslations } from "./localization";
import { formatFileSize } from "./fileSize";

const DEFAULT_COPY = getAttachmentTranslations("en");

export const AttachedFileRow = ({
  file,
  copy = DEFAULT_COPY,
  isConfirmingRemoval,
  downloadEndpoint,
  onRequestRemove,
  onConfirmRemove,
  onCancelRemove,
  onDownloadError,
}) => {
  const confirmButtonRef = useRef(null);

  // Accessibility: When user initiates file removal, automatically focus the confirm button
  // This helps ensure the destructive action requires intentional interaction and makes it
  // easier for keyboard/screen reader users to confirm or cancel
  useEffect(() => {
    if (isConfirmingRemoval && confirmButtonRef.current) {
      confirmButtonRef.current.focus();
    }
  }, [isConfirmingRemoval]);
  const isInProgress =
    file.status === ATTACHMENT_STATUSES.UPLOADING ||
    file.status === ATTACHMENT_STATUSES.PENDING_VIRUS_SCAN;
  const isUploaded = file.status === ATTACHMENT_STATUSES.UPLOADED;
  const isMalware = file.status === ATTACHMENT_STATUSES.VIRUS_SCAN_FAILED;
  const downloadHref = downloadEndpoint
    ? `${downloadEndpoint}/${encodeURIComponent(file.id)}`
    : null;
  const canDownload = !isInProgress && !isMalware && Boolean(downloadHref);
  const fileSizeLabel = formatFileSize(file.file_size);

  const handleDownload = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(downloadHref);
      if (!response.ok) {
        throw new Error(`Download failed with status ${response.status}`);
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      if (typeof onDownloadError === "function") {
        onDownloadError(file.id, error.message);
      }
    }
  };

  const fileNameNode = canDownload ? (
    <a
      href={downloadHref}
      onClick={handleDownload}
      className="attachment-file-name-truncate"
      title={file.name}
      aria-label={`Download ${file.name}`}
      data-testid="attachment-download-link"
    >
      {file.name}
    </a>
  ) : (
    <span className="attachment-file-name-truncate">{file.name}</span>
  );

  return (
    <li
      className={`attachment-file-row border border-gray-300 p-3 mb-2${isMalware ? " bg-gray-100" : ""}${isConfirmingRemoval ? " border-red" : ""}`}
      data-testid="attached-file-row"
    >
      {isConfirmingRemoval ? (
        <div className="p-4" role="alert">
          <p className="heading-small mt-0 mb-3">{copy.removeConfirmTitle}</p>
          {isUploaded ? (
            <p className="mb-3 mt-0">
              {copy.removeConfirmBodyPrefix} '{fileNameNode}'{" "}
              {copy.removeConfirmBodySuffix}
            </p>
          ) : null}
          <div className="flex gap-4 mt-6">
            <button
              ref={confirmButtonRef}
              type="button"
              className="button button-red"
              data-testid="attachments-remove-confirm"
              aria-label={`Yes, remove ${file.name}`}
              onClick={() => onConfirmRemove(file.id)}
            >
              {copy.yesRemoveFile}
            </button>
            <button
              type="button"
              className="button button-secondary"
              data-testid="attachments-remove-cancel"
              onClick={onCancelRemove}
            >
              {copy.cancel}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex justify-between gap-6 items-start">
          <div className="flex flex-col min-w-0">
            {isMalware ? (
              <p
                className="text-red-700 font-bold"
                data-testid="attachment-malware-message"
              >
                {copy.malwareMessage}
              </p>
            ) : null}
            <div className="flex items-center min-w-0">
              {isInProgress ? (
                <div
                  className="loading-spinner shrink-0 mr-3"
                  role="status"
                  aria-label={copy.rowSpinnerAriaLabel}
                  data-testid="attachment-row-spinner"
                ></div>
              ) : null}
              <p className="min-w-0 mb-0">
                {fileNameNode}
                {fileSizeLabel ? (
                  <span className="attachment-size" data-testid="attachment-file-size">
                    {` (${fileSizeLabel})`}
                  </span>
                ) : null}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="link text-red-700 shrink-0 inline-flex items-center gap-2 self-start"
            data-testid="attachments-remove"
            aria-label={`Remove ${file.name}`}
            onClick={() => onRequestRemove(file.id)}
          >
            <span className="font-bold underline">{copy.remove}</span>
            <span className="text-[24px]" aria-hidden="true">
              ×
            </span>
          </button>
        </div>
      )}
    </li>
  );
};
