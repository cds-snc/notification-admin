import React, { useMemo, useState } from "react";
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
  csrfToken,
  lang = "en",
  classificationUrl,
}) => {
  const [isAttachModalOpen, setAttachModalOpen] = useState(false);
  const [validationIssues, setValidationIssues] = useState([]);
  const [removeCandidateId, setRemoveCandidateId] = useState(null);
  const copy = useMemo(() => getAttachmentTranslations(lang), [lang]);

  const { files, attachFiles, removeFile } = useAttachments(initialFiles, copy);

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
      throw new Error(`Failed to upload attachments (${response.status})`);
    }

    if (!response.headers.get("content-type")?.includes("application/json")) {
      return [];
    }

    const payload = await response.json();
    if (Array.isArray(payload)) {
      return payload;
    }

    return payload.data || payload.files || [];
  };

  const deleteFile = async (file) => {
    const response = await fetch(removeEndpoint, {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        ...(csrfToken
          ? {
              "X-CSRFToken": csrfToken,
            }
          : {}),
      },
      body: JSON.stringify({
        fileId: file.id,
        name: file.name,
      }),
    });

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

    await attachFiles(result.acceptedFiles, uploadFiles);
    setAttachModalOpen(false);
  };

  return (
    <section className="mb-16" data-testid="attachments-widget">
      <h2 className="heading-medium">{copy.attachedFilesHeading}</h2>

      {files.length ? (
        <ul className="mt-4 mb-4" data-testid="attachments-list">
          {files.map((file) => (
            <AttachedFileRow
              key={file.id}
              file={file}
              isConfirmingRemoval={removeCandidateId === file.id}
              onRequestRemove={setRemoveCandidateId}
              onConfirmRemove={async (fileId) => {
                const fileToRemove = files.find((currentFile) => currentFile.id === fileId);
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
                }
              }}
              onCancelRemove={() => setRemoveCandidateId(null)}
              copy={copy}
            />
          ))}
        </ul>
      ) : null}

      <div className="flex items-center justify-between gap-4 border-t border-gray-300 pt-4">
        <p className="hint" data-testid="attachments-summary">
          {statusSummary}
        </p>
        <button
          type="button"
          className="button button-secondary"
          data-testid="attachments-open-modal"
          onClick={() => setAttachModalOpen(true)}
        >
          {files.length ? copy.attachMoreFiles : copy.attachFiles}
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
