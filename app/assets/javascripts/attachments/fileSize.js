export const formatFileSize = (sizeInBytes) => {
  if (
    typeof sizeInBytes !== "number" ||
    Number.isNaN(sizeInBytes) ||
    sizeInBytes < 0
  ) {
    return null;
  }

  if (sizeInBytes < 1024) {
    return `${sizeInBytes} B`;
  }

  if (sizeInBytes < 1024 * 1024) {
    return `${(sizeInBytes / 1024).toFixed(1)} KB`;
  }

  return `${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const sumAttachmentFileSizes = (files = []) =>
  files.reduce((sum, file) => {
    if (typeof file?.file_size !== "number" || Number.isNaN(file.file_size)) {
      return sum;
    }

    return sum + file.file_size;
  }, 0);