import React from "react";
import { ATTACHMENT_STATUSES } from "./useAttachments";
import { getAttachmentTranslations } from "./localization";

const DEFAULT_COPY = getAttachmentTranslations("en");

export const AttachedFileRow = ({
  file,
  copy = DEFAULT_COPY,
  isConfirmingRemoval,
  onRequestRemove,
  onConfirmRemove,
  onCancelRemove,
}) => {
  const isInProgress =
    file.status === ATTACHMENT_STATUSES.UPLOADING ||
    file.status === ATTACHMENT_STATUSES.PENDING_SCAN;
  const isMalware = file.status === ATTACHMENT_STATUSES.MALWARE;
  const isAttached = file.status === ATTACHMENT_STATUSES.ATTACHED;

  return (
    <li
      className={`attachment-file-row border border-gray-300 p-3 mb-2${isMalware ? " bg-gray-100" : ""}`}
      data-testid="attached-file-row"
    >
      {isConfirmingRemoval ? (
        <div className="banner-dangerous p-4" role="alert">
          <p className="heading-small">{copy.removeConfirmTitle}</p>
          <p className="mb-3">
            {copy.removeConfirmBodyPrefix}{" "}
            <span title={file.name} className="attachment-file-name-truncate">
              '{file.name}'
            </span>{" "}
            {copy.removeConfirmBodySuffix}
          </p>
          <div className="flex gap-4">
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
        <div className="flex justify-between gap-6 items-center">
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
                  className="loading-spinner shrink-0"
                  role="status"
                  aria-label={copy.rowSpinnerAriaLabel}
                  data-testid="attachment-row-spinner"
                ></div>
              ) : null}
              <p className="min-w-0">
                <span
                  title={file.name}
                  className="attachment-file-name-truncate"
                >
                  {file.name}
                </span>
              </p>
            </div>
          </div>
          <button
            type="button"
            className="link text-red-700 shrink-0 inline-flex items-center gap-2"
            data-testid="attachments-remove"
            onClick={() => onRequestRemove(file.id)}
          >
            <span className="underline">{copy.remove}</span>
            <span aria-hidden="true">×</span>
          </button>
        </div>
      )}
    </li>
  );
};
