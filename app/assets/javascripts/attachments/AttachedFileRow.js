import React from "react";
import { ATTACHMENT_STATUSES } from "./useAttachments";
import { getAttachmentTranslations } from "./localization";

const DEFAULT_COPY = getAttachmentTranslations("en");

export const AttachedFileRow = ({
  file,
  copy = DEFAULT_COPY,
  isConfirmingRemoval,
  downloadEndpoint,
  onRequestRemove,
  onConfirmRemove,
  onCancelRemove,
}) => {
  const isInProgress =
    file.status === ATTACHMENT_STATUSES.UPLOADING ||
    file.status === ATTACHMENT_STATUSES.PENDING_VIRUS_SCAN;
  const isUploaded = file.status === ATTACHMENT_STATUSES.UPLOADED;
  const isMalware = file.status === ATTACHMENT_STATUSES.VIRUS_SCAN_FAILED;
  const downloadHref = downloadEndpoint
    ? `${downloadEndpoint}/${encodeURIComponent(file.id)}`
    : null;
  const canDownload = !isInProgress && !isMalware && Boolean(downloadHref);

  const fileNameNode = canDownload ? (
    <a
      href={downloadHref}
      download={file.name}
      className="attachment-file-name-truncate"
      title={file.name}
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
              type="button"
              className="button button-red"
              data-testid="attachments-remove-confirm"
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
              <p className="min-w-0 mb-0">{fileNameNode}</p>
            </div>
          </div>
          <button
            type="button"
            className="link text-red-700 shrink-0 inline-flex items-center gap-2 self-start"
            data-testid="attachments-remove"
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
