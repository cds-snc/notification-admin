const toFiniteFileSize = (value) => {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }

  return parsed;
};

export const formatFileSize = (sizeInBytes) => {
  const normalizedSize = toFiniteFileSize(sizeInBytes);

  if (normalizedSize === null) {
    return null;
  }

  if (normalizedSize < 1024) {
    return `${normalizedSize} B`;
  }

  if (normalizedSize < 1024 * 1024) {
    return `${(normalizedSize / 1024).toFixed(1)} KB`;
  }

  return `${(normalizedSize / (1024 * 1024)).toFixed(1)} MB`;
};

export const sumAttachmentFileSizes = (files = []) =>
  files.reduce((sum, file) => {
    const fileSize = toFiniteFileSize(file?.file_size);

    if (fileSize === null) {
      return sum;
    }

    return sum + fileSize;
  }, 0);
