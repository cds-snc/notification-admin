const React = require("react");
const ReactDOMClient = require("react-dom/client");
const { act } = React;

const { TextEncoder, TextDecoder } = require("util");
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

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
      file_size: 100,
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
      { status: ATTACHMENT_STATUSES.DELETED },
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

  test("groups malware and deleted into issues bucket", () => {
    const files = [
      { status: ATTACHMENT_STATUSES.VIRUS_SCAN_FAILED },
      { status: ATTACHMENT_STATUSES.DELETED },
    ];

    expect(summarizeStatuses(files)).toBe("2 files not attached");
  });
});

describe("attachments - render contracts", () => {
  test("uploaded file renders download link when download endpoint is configured", () => {
    const html = renderToStaticMarkup(
      React.createElement(AttachedFileRow, {
        file: {
          id: "file-download-1",
          name: "report.pdf",
          status: ATTACHMENT_STATUSES.UPLOADED,
        },
        downloadEndpoint: "/services/service-1/templates/template-1/attachments/download",
        isConfirmingRemoval: false,
        onRequestRemove: () => {},
        onConfirmRemove: () => {},
        onCancelRemove: () => {},
      }),
    );

    expect(html).toContain('data-testid="attachment-download-link"');
    expect(html).toContain('href="/services/service-1/templates/template-1/attachments/download/file-download-1"');
  });

  test.each([
    [ATTACHMENT_STATUSES.UPLOADING],
    [ATTACHMENT_STATUSES.PENDING_VIRUS_SCAN],
    [ATTACHMENT_STATUSES.VIRUS_SCAN_FAILED],
  ])("%s status does not render a download link", (status) => {
    const html = renderToStaticMarkup(
      React.createElement(AttachedFileRow, {
        file: {
          id: "file-no-download-1",
          name: "no-download.pdf",
          status,
        },
        downloadEndpoint: "/services/service-1/templates/template-1/attachments/download",
        isConfirmingRemoval: false,
        onRequestRemove: () => {},
        onConfirmRemove: () => {},
        onCancelRemove: () => {},
      }),
    );

    expect(html).not.toContain('data-testid="attachment-download-link"');
  });

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

  test("shows file size for byte-sized files", () => {
    const html = renderToStaticMarkup(
      React.createElement(AttachedFileRow, {
        file: {
          id: "file-size-bytes",
          name: "tiny.txt",
          file_size: 512,
          status: ATTACHMENT_STATUSES.UPLOADED,
        },
        isConfirmingRemoval: false,
        onRequestRemove: () => {},
        onConfirmRemove: () => {},
        onCancelRemove: () => {},
      }),
    );

    expect(html).toContain('data-testid="attachment-file-size"');
    expect(html).toContain("512 B");
  });

  test("shows file size for kilobyte and megabyte files", () => {
    const kbHtml = renderToStaticMarkup(
      React.createElement(AttachedFileRow, {
        file: {
          id: "file-size-kb",
          name: "report.pdf",
          file_size: 1536,
          status: ATTACHMENT_STATUSES.UPLOADED,
        },
        isConfirmingRemoval: false,
        onRequestRemove: () => {},
        onConfirmRemove: () => {},
        onCancelRemove: () => {},
      }),
    );

    const mbHtml = renderToStaticMarkup(
      React.createElement(AttachedFileRow, {
        file: {
          id: "file-size-mb",
          name: "large.pdf",
          file_size: 2 * 1024 * 1024,
          status: ATTACHMENT_STATUSES.UPLOADED,
        },
        isConfirmingRemoval: false,
        onRequestRemove: () => {},
        onConfirmRemove: () => {},
        onCancelRemove: () => {},
      }),
    );

    expect(kbHtml).toContain("1.5 KB");
    expect(mbHtml).toContain("2.0 MB");
  });

  test("does not show file size when size is missing", () => {
    const html = renderToStaticMarkup(
      React.createElement(AttachedFileRow, {
        file: {
          id: "file-no-size",
          name: "no-size.txt",
          status: ATTACHMENT_STATUSES.UPLOADED,
        },
        isConfirmingRemoval: false,
        onRequestRemove: () => {},
        onConfirmRemove: () => {},
        onCancelRemove: () => {},
      }),
    );

    expect(html).not.toContain('data-testid="attachment-file-size"');
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
    expect(html).toContain("Download a copy of");
    expect(html).not.toContain('data-testid="attachment-download-link"');
  });

  test("malware remove confirmation does not show download prompt text", () => {
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

    expect(html).not.toContain("Download a copy of");
    expect(html).not.toContain('data-testid="attachment-download-link"');
  });

  test("uploading remove confirmation does not show download prompt text", () => {
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

    expect(html).not.toContain("Download a copy of");
    expect(html).not.toContain('data-testid="attachment-download-link"');
  });

  test("pending scan remove confirmation does not show download prompt text", () => {
    const html = renderToStaticMarkup(
      React.createElement(AttachedFileRow, {
        file: {
          id: "file-pending-remove-1",
          name: "pending-scan.pdf",
          status: ATTACHMENT_STATUSES.PENDING_VIRUS_SCAN,
        },
        isConfirmingRemoval: true,
        onRequestRemove: () => {},
        onConfirmRemove: () => {},
        onCancelRemove: () => {},
      }),
    );

    expect(html).not.toContain("Download a copy of");
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

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  test("preserves provided string file_size", () => {
    const harness = setupHookHarness([
      {
        id: "file-1",
        name: "test.pdf",
        file_size: "2048",
        status: "uploaded",
      },
    ]);

    const [file] = harness.getState().files;

    expect(file.name).toBe("test.pdf");
    expect(file.file_size).toBe("2048");
    expect(file.status).toBe(ATTACHMENT_STATUSES.UPLOADED);

    harness.cleanup();
  });

  test("uses id from upload response", async () => {
    const harness = setupHookHarness();

    await act(async () => {
      await harness.getState().attachFiles(
        [{ name: "document-id.pdf", size: 2468 }],
        async () => [{ status: ATTACHMENT_STATUSES.UPLOADED, id: "file-456" }],
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

  test("prefers id over document_id when both are present", async () => {
    const harness = setupHookHarness();

    await act(async () => {
      await harness.getState().attachFiles(
        [{ name: "both-ids.pdf", size: 2468 }],
        async () => [
          {
            status: ATTACHMENT_STATUSES.PENDING_VIRUS_SCAN,
            id: "file-id-preferred",
            document_id: "document-id-secondary",
          },
        ],
      );
    });

    act(() => {
      jest.advanceTimersByTime(500);
      jest.advanceTimersByTime(1800);
    });

    const [file] = harness.getState().files;
    expect(file.id).toBe("file-id-preferred");
    expect(file.status).toBe(ATTACHMENT_STATUSES.PENDING_VIRUS_SCAN);

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

  test("stops polling after status becomes uploaded", async () => {
    const fetchFileStatus = jest
      .fn()
      .mockResolvedValueOnce({ status: "pending_virus_scan" })
      .mockResolvedValueOnce({ status: "uploaded" });

    const harness = setupHookHarness(
      [
        {
          id: "file-stop-uploaded",
          name: "pending.pdf",
          status: "pending_virus_scan",
        },
      ],
      fetchFileStatus,
    );

    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      jest.advanceTimersByTime(2000);
      await Promise.resolve();
    });

    expect(fetchFileStatus).toHaveBeenCalledTimes(2);

    await act(async () => {
      jest.advanceTimersByTime(10000);
      await Promise.resolve();
    });

    expect(fetchFileStatus).toHaveBeenCalledTimes(2);

    harness.cleanup();
  });

  test("stops polling after status becomes virus_scan_failed", async () => {
    const fetchFileStatus = jest
      .fn()
      .mockResolvedValueOnce({ status: "pending_virus_scan" })
      .mockResolvedValueOnce({ status: "virus_scan_failed" });

    const harness = setupHookHarness(
      [
        {
          id: "file-stop-malware",
          name: "pending.pdf",
          status: "pending_virus_scan",
        },
      ],
      fetchFileStatus,
    );

    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      jest.advanceTimersByTime(2000);
      await Promise.resolve();
    });

    expect(fetchFileStatus).toHaveBeenCalledTimes(2);

    await act(async () => {
      jest.advanceTimersByTime(10000);
      await Promise.resolve();
    });

    expect(fetchFileStatus).toHaveBeenCalledTimes(2);

    harness.cleanup();
  });

  test("keeps file in pending_virus_scan when upload callback returns wrapped data response", async () => {
    const harness = setupHookHarness();

    await act(async () => {
      await harness.getState().attachFiles(
        [{ name: "wrapped-pending.pdf", size: 2048 }],
        async () => [
          {
            data: {
              id: "file-wrapped-1",
              status: "pending_virus_scan",
            },
          },
        ],
      );
    });

    act(() => {
      jest.advanceTimersByTime(500);
      jest.advanceTimersByTime(1800);
    });

    const [file] = harness.getState().files;
    expect(file.id).toBe("file-wrapped-1");
    expect(file.status).toBe(ATTACHMENT_STATUSES.PENDING_VIRUS_SCAN);

    harness.cleanup();
  });

  test("keeps file in pending_virus_scan when upload callback returns non-array payload", async () => {
    const harness = setupHookHarness();

    await act(async () => {
      await harness.getState().attachFiles(
        [{ name: "wrapped-list.pdf", size: 1024 }],
        async () => ({
          data: [
            {
              id: "file-wrapped-list-1",
              status: "pending_virus_scan",
            },
          ],
        }),
      );
    });

    act(() => {
      jest.advanceTimersByTime(500);
      jest.advanceTimersByTime(1800);
    });

    expect(harness.getState().files).toHaveLength(0);

    harness.cleanup();
  });

  test("keeps file in pending_virus_scan when upload callback returns unknown status", async () => {
    const harness = setupHookHarness();

    await act(async () => {
      await harness.getState().attachFiles(
        [{ name: "unknown-status.pdf", size: 2048 }],
        async () => [
          {
            id: "file-unknown-status-1",
            status: "created",
          },
        ],
      );
    });

    act(() => {
      jest.advanceTimersByTime(500);
      jest.advanceTimersByTime(1800);
    });

    const [file] = harness.getState().files;
    expect(file.id).toBe("file-unknown-status-1");
    expect(file.status).toBe(ATTACHMENT_STATUSES.PENDING_VIRUS_SCAN);

    harness.cleanup();
  });

  test("does not render file when upload response has no id", async () => {
    const harness = setupHookHarness();

    await act(async () => {
      await harness.getState().attachFiles(
        [{ name: "missing-id.pdf", size: 2048 }],
        async () => [
          {
            status: ATTACHMENT_STATUSES.PENDING_VIRUS_SCAN,
          },
        ],
      );
    });

    expect(harness.getState().files).toHaveLength(0);

    harness.cleanup();
  });

  test("throws a retry error when upload callback fails", async () => {
    const harness = setupHookHarness();
    let thrownError = null;

    await act(async () => {
      try {
        await harness.getState().attachFiles(
          [{ name: "failed-upload.pdf", size: 2048 }],
          async () => {
            throw new Error("network error");
          },
        );
      } catch (error) {
        thrownError = error;
      }
    });

    expect(thrownError).toBeTruthy();
    expect(thrownError.message).toBe("network error");
    expect(harness.getState().files).toHaveLength(0);

    harness.cleanup();
  });
});

describe("attachments - download error handling", () => {
  const setupGlobalFetch = (ok, statusCode = 200) => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok,
        status: statusCode,
        blob: () => Promise.resolve(new Blob(["test content"])),
        headers: {
          get: () => null,
        },
      }),
    );
    global.URL.createObjectURL = jest.fn(() => "blob:mock-url");
    global.URL.revokeObjectURL = jest.fn();
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    delete global.fetch;
    delete global.URL.createObjectURL;
    delete global.URL.revokeObjectURL;
  });

  test("AttachedFileRow calls onDownloadError when fetch fails", async () => {
    setupGlobalFetch(false, 500);
    const onDownloadError = jest.fn();

    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = ReactDOMClient.createRoot(container);

    await act(async () => {
      root.render(
        React.createElement(AttachedFileRow, {
          file: {
            id: "file-1",
            name: "test.pdf",
            status: ATTACHMENT_STATUSES.UPLOADED,
          },
          downloadEndpoint: "/download",
          isConfirmingRemoval: false,
          onRequestRemove: () => {},
          onConfirmRemove: () => {},
          onCancelRemove: () => {},
          onDownloadError,
        }),
      );
    });

    const downloadLink = container.querySelector("[data-testid='attachment-download-link']");
    await act(async () => {
      downloadLink.click();
    });

    expect(onDownloadError).toHaveBeenCalledWith("file-1", expect.stringContaining("Download failed"));

    root.unmount();
    document.body.removeChild(container);
  });

  test("AttachedFileRow successfully downloads file when fetch succeeds", async () => {
    setupGlobalFetch(true);
    const onDownloadError = jest.fn();

    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = ReactDOMClient.createRoot(container);

    await act(async () => {
      root.render(
        React.createElement(AttachedFileRow, {
          file: {
            id: "file-2",
            name: "success.pdf",
            status: ATTACHMENT_STATUSES.UPLOADED,
          },
          downloadEndpoint: "/download",
          isConfirmingRemoval: false,
          onRequestRemove: () => {},
          onConfirmRemove: () => {},
          onCancelRemove: () => {},
          onDownloadError,
        }),
      );
    });

    const downloadLink = container.querySelector("[data-testid='attachment-download-link']");
    await act(async () => {
      downloadLink.click();
    });

    expect(onDownloadError).not.toHaveBeenCalled();
    expect(global.fetch).toHaveBeenCalledWith("/download/file-2");

    root.unmount();
    document.body.removeChild(container);
  });
});
