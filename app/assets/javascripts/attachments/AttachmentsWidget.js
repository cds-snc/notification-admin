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
  onAttachFiles,
  lang = "en",
  classificationUrl,
}) => {
  const [isAttachModalOpen, setAttachModalOpen] = useState(false);
  const [validationIssues, setValidationIssues] = useState([]);
  const [removeCandidateId, setRemoveCandidateId] = useState(null);
  const copy = useMemo(() => getAttachmentTranslations(lang), [lang]);

  const { files, attachFiles, removeFile } = useAttachments(initialFiles, copy);

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

    await attachFiles(result.acceptedFiles, onAttachFiles);
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
              onConfirmRemove={(fileId) => {
                removeFile(fileId);
                setRemoveCandidateId(null);
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
        onClose={() => {
          setAttachModalOpen(false);
          setValidationIssues([]);
        }}
        onAttach={handleAttach}
      />
    </section>
  );
};
