const React = require("react");

const { TextEncoder, TextDecoder } = require("util");
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

const { renderToStaticMarkup } = require("react-dom/server");

const {
  validateFiles,
  summarizeStatuses,
  ATTACHMENT_STATUSES,
  ACCEPT_ATTRIBUTE,
} = require("../../app/assets/javascripts/attachments/useAttachments");
const {
  AttachedFileRow,
} = require("../../app/assets/javascripts/attachments/AttachedFileRow");

describe("attachments - validateFiles", () => {
  test("accepts all supported extensions", () => {
    const supported = [
      "pdf",
      "doc",
      "docx",
      "odt",
      "rtf",
      "txt",
      "xlsx",
      "csv",
      "json",
      "jpeg",
      "jpg",
      "png",
    ];

    supported.forEach((extension) => {
      const selectedFiles = [{ name: `sample.${extension}`, size: 1024 }];
      const result = validateFiles(selectedFiles, []);

      expect(result.issues).toEqual([]);
      expect(result.acceptedFiles).toHaveLength(1);
      expect(result.acceptedFiles[0].name).toBe(`sample.${extension}`);
    });
  });

  test("accepts supported files and rejects unsupported extension", () => {
    const existingFiles = [];
    const selectedFiles = [
      { name: "ok.pdf", size: 1000 },
      { name: "bad.exe", size: 1000 },
    ];

    const result = validateFiles(selectedFiles, existingFiles);

    expect(result.acceptedFiles).toHaveLength(1);
    expect(result.acceptedFiles[0].name).toBe("ok.pdf");
    expect(result.issues).toContain("bad.exe has an unsupported file type.");
  });

  test("rejects representative unsupported file types", () => {
    const selectedFiles = [
      { name: "installer.exe", size: 1000 },
      { name: "archive.zip", size: 1000 },
      { name: "script.js", size: 1000 },
    ];

    const result = validateFiles(selectedFiles, []);

    expect(result.acceptedFiles).toHaveLength(0);
    expect(result.issues).toContain("installer.exe has an unsupported file type.");
    expect(result.issues).toContain("archive.zip has an unsupported file type.");
    expect(result.issues).toContain("script.js has an unsupported file type.");
  });

  test("rejects filenames containing parentheses", () => {
    const result = validateFiles([{ name: "my(file).pdf", size: 123 }], []);

    expect(result.acceptedFiles).toHaveLength(0);
    expect(result.issues).toContain("my(file).pdf cannot contain parentheses.");
  });

  test("enforces max file count and max total size", () => {
    const existingFiles = Array.from({ length: 10 }, (_, i) => ({
      id: `existing-${i}`,
      name: `existing-${i}.pdf`,
      size: 100,
    }));

    const selectedFiles = [{ name: "extra.pdf", size: 6 * 1024 * 1024 }];

    const result = validateFiles(selectedFiles, existingFiles);

    expect(result.issues).toContain("Choose up to 10 files.");
    expect(result.issues).toContain("Maximum 6 MB for all files combined.");
  });
});

describe("attachments - summarizeStatuses", () => {
  test("returns no files message for empty list", () => {
    expect(summarizeStatuses([])).toBe("No files attached");
  });

  test("returns grouped summary text", () => {
    const files = [
      { status: ATTACHMENT_STATUSES.UPLOADING },
      { status: ATTACHMENT_STATUSES.PENDING_SCAN },
      { status: ATTACHMENT_STATUSES.ATTACHED },
      { status: ATTACHMENT_STATUSES.UPLOAD_FAILED },
    ];

    expect(summarizeStatuses(files)).toBe("1 file uploading, 1 file scanning, 1 file attached, 1 file not attached");
  });

  test("summarizes attached-only files with proper pluralization", () => {
    const files = [
      { status: ATTACHMENT_STATUSES.ATTACHED },
      { status: ATTACHMENT_STATUSES.ATTACHED },
    ];

    expect(summarizeStatuses(files)).toBe("2 files attached");
  });

  test("summarizes in-progress only combinations", () => {
    const files = [
      { status: ATTACHMENT_STATUSES.UPLOADING },
      { status: ATTACHMENT_STATUSES.UPLOADING },
      { status: ATTACHMENT_STATUSES.PENDING_SCAN },
    ];

    expect(summarizeStatuses(files)).toBe("2 files uploading, 1 file scanning");
  });

  test("groups malware and upload-failed into issues bucket", () => {
    const files = [
      { status: ATTACHMENT_STATUSES.MALWARE },
      { status: ATTACHMENT_STATUSES.UPLOAD_FAILED },
    ];

    expect(summarizeStatuses(files)).toBe("2 files not attached");
  });
});

describe("attachments - render contracts", () => {
  test("renders duplicate filenames as separate rows when ids differ", () => {
    const html = renderToStaticMarkup(
      React.createElement(React.Fragment, null,
        React.createElement(AttachedFileRow, {
          file: {
            id: "file-a",
            name: "duplicate-name.pdf",
            status: ATTACHMENT_STATUSES.ATTACHED,
          },
          isConfirmingRemoval: false,
          onRequestRemove: () => {},
          onConfirmRemove: () => {},
          onCancelRemove: () => {},
        }),
        React.createElement(AttachedFileRow, {
          file: {
            id: "file-b",
            name: "duplicate-name.pdf",
            status: ATTACHMENT_STATUSES.PENDING_SCAN,
          },
          isConfirmingRemoval: false,
          onRequestRemove: () => {},
          onConfirmRemove: () => {},
          onCancelRemove: () => {},
        }),
      ),
    );

    const duplicateNameMatches = html.match(/duplicate-name\.pdf/g) || [];
    const rowMatches = html.match(/data-testid="attached-file-row"/g) || [];
    const spinnerMatches = html.match(/data-testid="attachment-row-spinner"/g) || [];

    expect(duplicateNameMatches.length).toBeGreaterThanOrEqual(2);
    expect(rowMatches).toHaveLength(2);
    expect(spinnerMatches).toHaveLength(1);
  });

  test("remove button underlines only text label, not x icon", () => {
    const html = renderToStaticMarkup(
      React.createElement(AttachedFileRow, {
        file: {
          id: "file-1",
          name: "Filename.pdf",
          status: ATTACHMENT_STATUSES.ATTACHED,
        },
        isConfirmingRemoval: false,
        onRequestRemove: () => {},
        onConfirmRemove: () => {},
        onCancelRemove: () => {},
      }),
    );

    expect(html).toContain('<span class="underline">Remove</span>');
    expect(html).toContain('<span aria-hidden="true">×</span>');
    expect(html).not.toContain("gap-2 underline");
  });

  test("malware state shows unsafe-file message", () => {
    const html = renderToStaticMarkup(
      React.createElement(AttachedFileRow, {
        file: {
          id: "malware-1",
          name: "document_with_malware.pdf",
          status: ATTACHMENT_STATUSES.MALWARE,
        },
        isConfirmingRemoval: false,
        onRequestRemove: () => {},
        onConfirmRemove: () => {},
        onCancelRemove: () => {},
      }),
    );

    expect(html).toContain("This file is unsafe and was not attached.");
    expect(html).toContain("document_with_malware.pdf");
  });

  test("filename render includes truncation style contract", () => {
    const html = renderToStaticMarkup(
      React.createElement(AttachedFileRow, {
        file: {
          id: "file-2",
          name: "Sometimes_you_need_a_very_very_very_very_long_file_name_final_v1_final_final_3_hello.pdf",
          status: ATTACHMENT_STATUSES.ATTACHED,
        },
        isConfirmingRemoval: false,
        onRequestRemove: () => {},
        onConfirmRemove: () => {},
        onCancelRemove: () => {},
      }),
    );

    expect(html).toContain('class="attachment-file-name-truncate"');
  });

  test("accept attribute includes expected extensions", () => {
    const expectedExtensions = [
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

    expectedExtensions.forEach((extension) => {
      expect(ACCEPT_ATTRIBUTE).toContain(extension);
    });

    expect(ACCEPT_ATTRIBUTE).not.toContain(".exe");
    expect(ACCEPT_ATTRIBUTE).not.toContain(".zip");
  });
});
