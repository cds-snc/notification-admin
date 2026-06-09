import { useEffect, useMemo, useRef, useState } from "react";
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
  PENDING_VIRUS_SCAN: "pending_virus_scan",
  UPLOADED: "uploaded",
  VIRUS_SCAN_FAILED: "virus_scan_failed",
  DELETED: "deleted",
};

const VALID_ATTACHMENT_STATUSES = new Set(Object.values(ATTACHMENT_STATUSES));

const FILE_STATUS_POLL_INTERVAL_MS = 2000;

const ALLOWED_EXTENSIONS = new Set(ACCEPTED_EXTENSIONS);

const hasInvalidParentheses = (fileName) =>
  fileName.includes("(") || fileName.includes(")");

const getExtension = (fileName) => {
  const lastDot = fileName.lastIndexOf(".");
  if (lastDot === -1) {
    return "";
  }
  return fileName.slice(lastDot).toLowerCase();
};

export const validateFiles = (
  selectedFiles,
  existingFiles,
  copy = DEFAULT_COPY,
) => {
  const issues = [];
  const acceptedFiles = [];

  const totalSelectedCount = existingFiles.length + selectedFiles.length;
  if (totalSelectedCount > MAX_FILES) {
    issues.push(copy.chooseUpToFiles(MAX_FILES));
  }

  const existingTotalBytes = existingFiles.reduce(
    (sum, file) => sum + (file.size || 0),
    0,
  );
  const selectedTotalBytes = selectedFiles.reduce(
    (sum, file) => sum + file.size,
    0,
  );

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

const parseApiStatus = (status, fallbackStatus) =>
  VALID_ATTACHMENT_STATUSES.has(status) ? status : fallbackStatus;

const normalizeFile = (file) => ({
  ...file,
  status: parseApiStatus(file.status, ATTACHMENT_STATUSES.DELETED),
});

export const summarizeStatuses = (files, copy = DEFAULT_COPY) => {
  const counts = {
    scanning: 0,
    uploading: 0,
    attached: 0,
    failed: 0,
  };

  for (const file of files) {
    if (file.status === ATTACHMENT_STATUSES.PENDING_VIRUS_SCAN) {
      counts.scanning += 1;
    } else if (file.status === ATTACHMENT_STATUSES.UPLOADING) {
      counts.uploading += 1;
    } else if (file.status === ATTACHMENT_STATUSES.UPLOADED) {
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

export const useAttachments = (
  initialFiles = [],
  copy = DEFAULT_COPY,
  fetchFileStatus = null,
) => {
  const [files, setFiles] = useState(() => initialFiles.map(normalizeFile));
  const timeoutIdsRef = useRef([]);
  const pollTimeoutIdsRef = useRef(new Map());
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      timeoutIdsRef.current.forEach((timeoutId) => clearTimeout(timeoutId));
      timeoutIdsRef.current = [];
      pollTimeoutIdsRef.current.forEach((timeoutId) => clearTimeout(timeoutId));
      pollTimeoutIdsRef.current.clear();
    };
  }, []);

  useEffect(() => {
    if (typeof fetchFileStatus !== "function") {
      return;
    }

    const pendingFiles = files.filter(
      (file) => file.status === ATTACHMENT_STATUSES.PENDING_VIRUS_SCAN,
    );

    const pendingIds = new Set(pendingFiles.map((file) => file.id));

    pollTimeoutIdsRef.current.forEach((timeoutId, fileId) => {
      if (!pendingIds.has(fileId)) {
        clearTimeout(timeoutId);
        pollTimeoutIdsRef.current.delete(fileId);
      }
    });

    pendingFiles.forEach((file) => {
      if (pollTimeoutIdsRef.current.has(file.id)) {
        return;
      }

      const poll = async () => {
        if (!isMountedRef.current) {
          return;
        }

        try {
          const response = await fetchFileStatus(file.id);
          const responseData = response?.data || response;
          const nextStatus = parseApiStatus(
            responseData?.status,
            ATTACHMENT_STATUSES.PENDING_VIRUS_SCAN,
          );

          if (nextStatus === ATTACHMENT_STATUSES.PENDING_VIRUS_SCAN) {
            const timeoutId = setTimeout(poll, FILE_STATUS_POLL_INTERVAL_MS);
            pollTimeoutIdsRef.current.set(file.id, timeoutId);
            return;
          }

          pollTimeoutIdsRef.current.delete(file.id);
          setFiles((currentFiles) =>
            currentFiles.map((currentFile) =>
              currentFile.id === file.id
                ? {
                    ...currentFile,
                    id:
                      responseData?.id ||
                      responseData?.document_id ||
                      currentFile.id,
                    status: nextStatus,
                    sourceFile: undefined,
                  }
                : currentFile,
            ),
          );
        } catch (error) {
          const timeoutId = setTimeout(poll, FILE_STATUS_POLL_INTERVAL_MS);
          pollTimeoutIdsRef.current.set(file.id, timeoutId);
        }
      };

      poll();
    });
  }, [files, fetchFileStatus]);

  const schedule = (callback, delay) => {
    const timeoutId = setTimeout(() => {
      if (!isMountedRef.current) {
        return;
      }
      callback();
      timeoutIdsRef.current = timeoutIdsRef.current.filter(
        (id) => id !== timeoutId,
      );
    }, delay);

    timeoutIdsRef.current.push(timeoutId);
    return timeoutId;
  };

  const pendingCount = useMemo(
    () =>
      files.filter(
        (file) =>
          file.status === ATTACHMENT_STATUSES.UPLOADING ||
          file.status === ATTACHMENT_STATUSES.PENDING_VIRUS_SCAN,
      ).length,
    [files],
  );

  const attachFiles = async (selectedFiles, onAttachFiles) => {
    const prepared = selectedFiles.map((file) => ({
      id: nextId(),
      name: file.name,
      size: file.size,
      status: ATTACHMENT_STATUSES.UPLOADING,
      sourceFile: file,
    }));

    if (!prepared.length) {
      return;
    }

    setFiles((currentFiles) => [...currentFiles, ...prepared]);

    const preparedIds = new Set(prepared.map((file) => file.id));

    schedule(() => {
      setFiles((currentFiles) =>
        currentFiles.map((currentFile) =>
          preparedIds.has(currentFile.id)
            ? { ...currentFile, status: ATTACHMENT_STATUSES.PENDING_VIRUS_SCAN }
            : currentFile,
        ),
      );
    }, 500);

    try {
      let callbackResult = null;

      if (typeof onAttachFiles === "function") {
        callbackResult = await onAttachFiles(selectedFiles);
      }

      const callbackItems = Array.isArray(callbackResult) ? callbackResult : [];

      const resultById = new Map();
      if (callbackItems.length) {
        callbackItems.forEach((item, index) => {
          const preparedFile = prepared[index];
          if (!preparedFile) {
            return;
          }

          const itemData = item?.data || item;
          const status = parseApiStatus(
            itemData?.status,
            ATTACHMENT_STATUSES.PENDING_VIRUS_SCAN,
          );

          resultById.set(preparedFile.id, {
            id: itemData?.id || itemData?.document_id,
            status,
          });
        });
      }

      prepared.forEach((preparedFile) => {
        if (resultById.has(preparedFile.id)) {
          return;
        }

        resultById.set(preparedFile.id, {
          id: preparedFile.id,
          status: ATTACHMENT_STATUSES.PENDING_VIRUS_SCAN,
        });
      });

      schedule(() => {
        setFiles((currentFiles) =>
          currentFiles.map((currentFile) => {
            if (!preparedIds.has(currentFile.id)) {
              return currentFile;
            }

            const resolvedResult = resultById.get(currentFile.id) || {
              id: currentFile.id,
              status: ATTACHMENT_STATUSES.PENDING_VIRUS_SCAN,
            };

            return {
              ...currentFile,
              id: resolvedResult.id || currentFile.id,
              status: resolvedResult.status,
              sourceFile: undefined,
            };
          }),
        );
      }, 1800);
    } catch (error) {
      schedule(() => {
        setFiles((currentFiles) =>
          currentFiles.map((currentFile) =>
            preparedIds.has(currentFile.id)
              ? {
                  ...currentFile,
                  status: ATTACHMENT_STATUSES.DELETED,
                  sourceFile: undefined,
                }
              : currentFile,
          ),
        );
      }, 1800);
    }
  };

  const removeFile = (fileId) => {
    setFiles((currentFiles) => {
      return currentFiles.filter((file) => file.id !== fileId);
    });
  };

  return {
    files,
    pendingCount,
    attachFiles,
    removeFile,
  };
};
