const React = require("react");
const ReactDOMClient = require("react-dom/client");
const { act } = React;

const { TextEncoder, TextDecoder } = require("util");
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

const { renderToStaticMarkup } = require("react-dom/server");

const {
  validateFiles,
  summarizeStatuses,
  ATTACHMENT_STATUSES,
  ACCEPT_ATTRIBUTE,
  useAttachments,
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
      { status: ATTACHMENT_STATUSES.PENDING_VIRUS_SCAN },
      { status: ATTACHMENT_STATUSES.UPLOADED },
      { status: ATTACHMENT_STATUSES.UPLOAD_FAILED },
    ];

    expect(summarizeStatuses(files)).toBe("1 file uploading, 1 file scanning, 1 file attached, 1 file not attached");
  });

  test("summarizes attached-only files with proper pluralization", () => {
    const files = [
      { status: ATTACHMENT_STATUSES.UPLOADED },
      { status: ATTACHMENT_STATUSES.UPLOADED },
    ];

    expect(summarizeStatuses(files)).toBe("2 files attached");
  });

  test("summarizes in-progress only combinations", () => {
    const files = [
      { status: ATTACHMENT_STATUSES.UPLOADING },
      { status: ATTACHMENT_STATUSES.UPLOADING },
      { status: ATTACHMENT_STATUSES.PENDING_VIRUS_SCAN },
    ];

    expect(summarizeStatuses(files)).toBe("2 files uploading, 1 file scanning");
  });

  test("groups malware and upload-failed into issues bucket", () => {
    const files = [
      { status: ATTACHMENT_STATUSES.VIRUS_SCAN_FAILED },
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
            status: ATTACHMENT_STATUSES.UPLOADED,
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
            status: ATTACHMENT_STATUSES.PENDING_VIRUS_SCAN,
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
          status: ATTACHMENT_STATUSES.UPLOADED,
        },
        isConfirmingRemoval: false,
        onRequestRemove: () => {},
        onConfirmRemove: () => {},
        onCancelRemove: () => {},
      }),
    );

    expect(html).toContain('underline">Remove</span>');
    expect(html).toContain('aria-hidden="true">×</span>');
    expect(html).not.toContain("gap-2 underline");
  });

  test("malware state shows unsafe-file message", () => {
    const html = renderToStaticMarkup(
      React.createElement(AttachedFileRow, {
        file: {
          id: "malware-1",
          name: "document_with_malware.pdf",
          status: ATTACHMENT_STATUSES.VIRUS_SCAN_FAILED,
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
          status: ATTACHMENT_STATUSES.UPLOADED,
        },
        isConfirmingRemoval: false,
        onRequestRemove: () => {},
        onConfirmRemove: () => {},
        onCancelRemove: () => {},
      }),
    );

    expect(html).toContain('class="attachment-file-name-truncate"');
  });

  test("remove confirmation shows filename text", () => {
    const html = renderToStaticMarkup(
      React.createElement(AttachedFileRow, {
        file: {
          id: "file-download-2",
          name: "remove-me.pdf",
          status: ATTACHMENT_STATUSES.UPLOADED,
        },
        isConfirmingRemoval: true,
        onRequestRemove: () => {},
        onConfirmRemove: () => {},
        onCancelRemove: () => {},
      }),
    );

    expect(html).toContain("remove-me.pdf");
    expect(html).not.toContain('data-testid="attachment-download-link"');
  });

  test("malware remove confirmation shows plain prompt text", () => {
    const html = renderToStaticMarkup(
      React.createElement(AttachedFileRow, {
        file: {
          id: "file-malware-remove-1",
          name: "document_with_malware.pdf",
          status: ATTACHMENT_STATUSES.VIRUS_SCAN_FAILED,
        },
        isConfirmingRemoval: true,
        onRequestRemove: () => {},
        onConfirmRemove: () => {},
        onCancelRemove: () => {},
      }),
    );

    expect(html).toContain("Download a copy of");
    expect(html).not.toContain('data-testid="attachment-download-link"');
  });

  test("uploading remove confirmation shows plain prompt text", () => {
    const html = renderToStaticMarkup(
      React.createElement(AttachedFileRow, {
        file: {
          id: "file-uploading-remove-1",
          name: "still-uploading.pdf",
          status: ATTACHMENT_STATUSES.UPLOADING,
        },
        isConfirmingRemoval: true,
        onRequestRemove: () => {},
        onConfirmRemove: () => {},
        onCancelRemove: () => {},
      }),
    );

    expect(html).toContain("Download a copy of");
    expect(html).not.toContain('data-testid="attachment-download-link"');
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

describe("attachments - useAttachments", () => {
  const originalActEnvironment = global.IS_REACT_ACT_ENVIRONMENT;

  const setupHookHarness = (initialFiles = [], fetchFileStatus = null) => {
    let latest = null;

    const HookHarness = ({ files }) => {
      latest = useAttachments(files, undefined, fetchFileStatus);
      return null;
    };

    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = ReactDOMClient.createRoot(container);

    act(() => {
      root.render(React.createElement(HookHarness, { files: initialFiles }));
    });

    return {
      getState: () => latest,
      cleanup: () => {
        act(() => {
          root.unmount();
        });
        container.remove();
      },
    };
  };

  beforeAll(() => {
    global.IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterAll(() => {
    global.IS_REACT_ACT_ENVIRONMENT = originalActEnvironment;
  });

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  test("preserves document_id on attached files", async () => {
    const harness = setupHookHarness();

    await act(async () => {
      await harness.getState().attachFiles(
        [{ name: "document-id.pdf", size: 2468 }],
        async () => [{ status: ATTACHMENT_STATUSES.UPLOADED, document_id: "file-456" }],
      );
    });

    act(() => {
      jest.advanceTimersByTime(500);
      jest.advanceTimersByTime(1800);
    });

    const [file] = harness.getState().files;
    expect(file.status).toBe(ATTACHMENT_STATUSES.UPLOADED);
    expect(file.id).toBe("file-456");

    harness.cleanup();
  });

  test("normalizes pending_virus_scan initial files to scanning", async () => {
    const harness = setupHookHarness([
      {
        id: "file-999",
        name: "persisted.pdf",
          status: "pending_virus_scan",
      },
    ]);

    const { files, pendingCount } = harness.getState();

    expect(files).toHaveLength(1);
    expect(files[0].status).toBe(ATTACHMENT_STATUSES.PENDING_VIRUS_SCAN);
    expect(pendingCount).toBe(1);

    harness.cleanup();
  });

  test("polls pending_scan files until the backend finishes scanning", async () => {
    const fetchFileStatus = jest
      .fn()
      .mockResolvedValueOnce({ status: "pending_virus_scan" })
      .mockResolvedValueOnce({ status: "uploaded" });

    const harness = setupHookHarness(
      [
        {
          id: "file-777",
          name: "pending.pdf",
          status: "pending_virus_scan",
        },
      ],
      fetchFileStatus,
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(fetchFileStatus).toHaveBeenCalledTimes(1);

    await act(async () => {
      jest.advanceTimersByTime(2000);
      await Promise.resolve();
    });

    const [file] = harness.getState().files;
    expect(fetchFileStatus).toHaveBeenCalledTimes(2);
    expect(file.status).toBe(ATTACHMENT_STATUSES.UPLOADED);
    expect(file.id).toBe("file-777");

    harness.cleanup();
  });
});
