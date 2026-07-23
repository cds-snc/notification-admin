import React, { useMemo, useState, useRef } from "react";
import { AttachFilesModal } from "./AttachFilesModal";
import { AttachedFileRow } from "./AttachedFileRow";
import {
  summarizeStatuses,
  useAttachments,
  validateFiles,
} from "./useAttachments";
import { getAttachmentTranslations } from "./localization";

export const AttachmentsWidget = ({
  initialFiles = [],
  attachEndpoint,
  removeEndpoint,
  statusEndpoint,
  downloadEndpoint,
  csrfToken,
  lang = "en",
  classificationUrl,
  idPrefix = "attachments-widget",
}) => {
  const [isAttachModalOpen, setAttachModalOpen] = useState(false);
  const [validationIssues, setValidationIssues] = useState([]);
  const [removeCandidateId, setRemoveCandidateId] = useState(null);
  const [downloadError, setDownloadError] = useState(null);
  const copy = useMemo(() => getAttachmentTranslations(lang), [lang]);
  const attachMoreButtonRef = useRef(null);
  const statusId = `${idPrefix}-attachments-status`;
  const buttonLabelId = `${idPrefix}-attachments-button-label`;

  const fetchFileStatus = useMemo(() => {
    if (!statusEndpoint) {
      return null;
    }

    return async (fileId) => {
      const response = await fetch(
        `${statusEndpoint}/${encodeURIComponent(fileId)}`,
        {
          method: "GET",
          credentials: "same-origin",
        },
      );

      if (!response.ok) {
        throw new Error(
          `Failed to fetch attachment status (${response.status})`,
        );
      }

      if (!response.headers.get("content-type")?.includes("application/json")) {
        return null;
      }

      return response.json();
    };
  }, [statusEndpoint]);

  const { files, attachFiles, removeFile } = useAttachments(
    initialFiles,
    copy,
    fetchFileStatus,
  );

  const uploadFiles = async (selectedFiles) => {
    const formData = new FormData();
    selectedFiles.forEach((file) => {
      formData.append("files", file, file.name);
    });

    const response = await fetch(attachEndpoint, {
      method: "POST",
      credentials: "same-origin",
      headers: csrfToken
        ? {
            "X-CSRFToken": csrfToken,
          }
        : undefined,
      body: formData,
    });

    if (!response.ok) {
      let errorMessage = `Failed to upload attachments (${response.status})`;
      let createdFiles = [];

      // Try to extract error details from API response
      try {
        const errorData = await response.json();
        createdFiles = Array.isArray(errorData.created_files)
          ? errorData.created_files
          : [];
        if (errorData.error === "over_file_limit") {
          errorMessage = copy.overFileLimit;
        } else if (errorData.error === "unsupported_file_type") {
          errorMessage = copy.unsupportedFileType;
        } else if (errorData.message) {
          errorMessage = errorData.message;
        }
      } catch (parseError) {
        // Fall back to the default status-based message when response body is not JSON.
      }

      const uploadError = new Error(errorMessage);
      uploadError.createdFiles = createdFiles;
      throw uploadError;
    }

    if (!response.headers.get("content-type")?.includes("application/json")) {
      return [];
    }

    return response.json();
  };

  const deleteFile = async (file) => {
    const response = await fetch(
      `${removeEndpoint}/${encodeURIComponent(file.id)}`,
      {
        method: "POST",
        credentials: "same-origin",
        headers: csrfToken
          ? {
              "X-CSRFToken": csrfToken,
            }
          : undefined,
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to remove attachment (${response.status})`);
    }
  };

  const statusSummary = useMemo(
    () => summarizeStatuses(files, copy),
    [files, copy],
  );

  const handleAttach = async (selectedFiles) => {
    const result = validateFiles(selectedFiles, files, copy);
    setValidationIssues(result.issues);

    if (result.issues.length) {
      return;
    }

    try {
      await attachFiles(result.acceptedFiles, uploadFiles);
      setAttachModalOpen(false);
      // Focus the "attach more files" button after successful attachment
      if (attachMoreButtonRef.current) {
        setTimeout(() => {
          attachMoreButtonRef.current?.focus();
        }, 0);
      }
    } catch (error) {
      setValidationIssues([
        error.message || "Failed to attach files. Please try again.",
      ]);
    }
  };

  return (
    <section className="mb-16" data-testid="attachments-widget">
      <h2 className="heading-medium">{copy.attachedFilesHeading}</h2>

      {downloadError && (
        <div
          className="banner-dangerous p-4 mb-4"
          role="alert"
          data-testid="download-error-message"
        >
          <p>{downloadError}</p>
        </div>
      )}

      {files.length ? (
        <ul className="mt-4 mb-4" data-testid="attachments-list">
          {files.map((file) => (
            <AttachedFileRow
              key={file.id}
              file={file}
              isConfirmingRemoval={removeCandidateId === file.id}
              onRequestRemove={setRemoveCandidateId}
              onConfirmRemove={async (fileId) => {
                const fileToRemove = files.find(
                  (currentFile) => currentFile.id === fileId,
                );
                if (!fileToRemove) {
                  setRemoveCandidateId(null);
                  return;
                }

                try {
                  await deleteFile(fileToRemove);
                  removeFile(fileId);
                } catch (error) {
                  console.error(error);
                } finally {
                  setRemoveCandidateId(null);
                  if (attachMoreButtonRef.current) {
                    attachMoreButtonRef.current.focus();
                  }
                }
              }}
              onCancelRemove={() => {
                setRemoveCandidateId(null);
                if (attachMoreButtonRef.current) {
                  attachMoreButtonRef.current.focus();
                }
              }}
              onDownloadError={(fileId, error) => {
                setDownloadError(`Failed to download file. ${error}`);
              }}
              downloadEndpoint={downloadEndpoint}
              copy={copy}
            />
          ))}
        </ul>
      ) : null}

      <div className="flex items-center justify-between gap-4 border-t border-gray-300 pt-4">
        <p
          id={statusId}
          className="hint"
          data-testid="attachments-summary"
          aria-live="polite"
          aria-atomic="true"
        >
          {statusSummary}
        </p>
        <button
          ref={attachMoreButtonRef}
          type="button"
          className="button button-secondary"
          data-testid="attachments-open-modal"
          aria-labelledby={`${buttonLabelId} ${statusId}`}
          onClick={() => setAttachModalOpen(true)}
        >
          <span id={buttonLabelId}>
            {files.length ? copy.attachMoreFiles : copy.attachFiles}
          </span>
        </button>
      </div>

      <AttachFilesModal
        isOpen={isAttachModalOpen}
        issues={validationIssues}
        copy={copy}
        classificationUrl={classificationUrl}
        onIssuesChange={setValidationIssues}
        onValidateSelection={(selectedFiles) =>
          validateFiles(selectedFiles, files, copy)
        }
        onClose={() => {
          setAttachModalOpen(false);
          setValidationIssues([]);
        }}
        onAttach={handleAttach}
      />
    </section>
  );
};
