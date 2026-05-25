import { useMemo, useState } from "react";
import { getAttachmentTranslations } from "./localization";

const DEFAULT_COPY = getAttachmentTranslations("en");

export const MAX_FILES = 10;
export const MAX_TOTAL_BYTES = 6 * 1024 * 1024;
export const ACCEPTED_EXTENSIONS = [
  ".pdf",
  ".doc",
  ".docx",
  ".odt",
  ".rtf",
  ".txt",
  ".xlsx",
  ".csv",
  ".json",
  ".jpeg",
  ".jpg",
  ".png",
];
export const ACCEPT_ATTRIBUTE = ACCEPTED_EXTENSIONS.join(",");

export const ATTACHMENT_STATUSES = {
  UPLOADING: "uploading",
  PENDING_SCAN: "pending-scan",
  ATTACHED: "attached",
  MALWARE: "malware",
  UPLOAD_FAILED: "upload-failed",
};

const ALLOWED_EXTENSIONS = new Set(ACCEPTED_EXTENSIONS);

const hasInvalidParentheses = (fileName) => fileName.includes("(") || fileName.includes(")");

const getExtension = (fileName) => {
  const lastDot = fileName.lastIndexOf(".");
  if (lastDot === -1) {
    return "";
  }
  return fileName.slice(lastDot).toLowerCase();
};

export const validateFiles = (selectedFiles, existingFiles, copy = DEFAULT_COPY) => {
  const issues = [];
  const acceptedFiles = [];

  const totalSelectedCount = existingFiles.length + selectedFiles.length;
  if (totalSelectedCount > MAX_FILES) {
    issues.push(copy.chooseUpToFiles(MAX_FILES));
  }

  const existingTotalBytes = existingFiles.reduce((sum, file) => sum + (file.size || 0), 0);
  const selectedTotalBytes = selectedFiles.reduce((sum, file) => sum + file.size, 0);

  if (existingTotalBytes + selectedTotalBytes > MAX_TOTAL_BYTES) {
    issues.push(copy.maxCombinedSize);
  }

  for (const file of selectedFiles) {
    const extension = getExtension(file.name);

    if (!ALLOWED_EXTENSIONS.has(extension)) {
      issues.push(copy.unsupportedType(file.name));
      continue;
    }

    if (hasInvalidParentheses(file.name)) {
      issues.push(copy.filenameNoParentheses(file.name));
      continue;
    }

    acceptedFiles.push(file);
  }

  return {
    acceptedFiles,
    issues: Array.from(new Set(issues)),
  };
};

const nextId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const normalizeStatus = (status) => {
  if (
    status === ATTACHMENT_STATUSES.UPLOADING ||
    status === ATTACHMENT_STATUSES.PENDING_SCAN ||
    status === ATTACHMENT_STATUSES.ATTACHED ||
    status === ATTACHMENT_STATUSES.MALWARE ||
    status === ATTACHMENT_STATUSES.UPLOAD_FAILED
  ) {
    return status;
  }

  return ATTACHMENT_STATUSES.ATTACHED;
};

export const summarizeStatuses = (files, copy = DEFAULT_COPY) => {
  const counts = {
    scanning: 0,
    uploading: 0,
    attached: 0,
    failed: 0,
  };

  for (const file of files) {
    if (file.status === ATTACHMENT_STATUSES.PENDING_SCAN) {
      counts.scanning += 1;
    } else if (file.status === ATTACHMENT_STATUSES.UPLOADING) {
      counts.uploading += 1;
    } else if (file.status === ATTACHMENT_STATUSES.ATTACHED) {
      counts.attached += 1;
    } else {
      counts.failed += 1;
    }
  }

  const chunks = [];

  if (counts.uploading) {
    chunks.push(copy.summaryUploading(counts.uploading));
  }

  if (counts.scanning) {
    chunks.push(copy.summaryScanning(counts.scanning));
  }

  if (counts.attached) {
    chunks.push(copy.summaryAttached(counts.attached));
  }

  if (counts.failed) {
    chunks.push(copy.summaryNotAttached(counts.failed));
  }

  return chunks.length ? chunks.join(", ") : copy.noFilesAttached;
};

export const useAttachments = (initialFiles = [], copy = DEFAULT_COPY) => {
  const [files, setFiles] = useState(initialFiles);

  const pendingCount = useMemo(
    () =>
      files.filter(
        (file) => file.status === ATTACHMENT_STATUSES.UPLOADING || file.status === ATTACHMENT_STATUSES.PENDING_SCAN,
      ).length,
    [files],
  );

  const attachFiles = async (selectedFiles, onAttachFiles) => {
    const prepared = selectedFiles.map((file) => ({
      id: nextId(),
      name: file.name,
      size: file.size,
      status: ATTACHMENT_STATUSES.UPLOADING,
    }));

    if (!prepared.length) {
      return;
    }

    setFiles((currentFiles) => [...currentFiles, ...prepared]);

    const preparedIds = new Set(prepared.map((file) => file.id));

    setTimeout(() => {
      setFiles((currentFiles) =>
        currentFiles.map((currentFile) =>
          preparedIds.has(currentFile.id)
            ? { ...currentFile, status: ATTACHMENT_STATUSES.PENDING_SCAN }
            : currentFile,
        ),
      );
    }, 500);

    try {
      let callbackResult = null;

      if (typeof onAttachFiles === "function") {
        callbackResult = await onAttachFiles(selectedFiles);
      }

      const statusById = new Map();
      if (Array.isArray(callbackResult)) {
        callbackResult.forEach((item, index) => {
          const preparedFile = prepared[index];
          if (!preparedFile) {
            return;
          }
          statusById.set(preparedFile.id, normalizeStatus(item?.status));
        });
      }

      setTimeout(() => {
        setFiles((currentFiles) =>
          currentFiles.map((currentFile) => {
            if (!preparedIds.has(currentFile.id)) {
              return currentFile;
            }

            return {
              ...currentFile,
              status: statusById.get(currentFile.id) || ATTACHMENT_STATUSES.ATTACHED,
            };
          }),
        );
      }, 1800);
    } catch (error) {
      setTimeout(() => {
        setFiles((currentFiles) =>
          currentFiles.map((currentFile) =>
            preparedIds.has(currentFile.id)
              ? { ...currentFile, status: ATTACHMENT_STATUSES.UPLOAD_FAILED }
              : currentFile,
          ),
        );
      }, 1800);
    }
  };

  const removeFile = (fileId) => {
    setFiles((currentFiles) => currentFiles.filter((file) => file.id !== fileId));
  };

  return {
    files,
    pendingCount,
    attachFiles,
    removeFile,
  };
};
