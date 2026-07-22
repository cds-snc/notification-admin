const React = require("react");
const ReactDOMClient = require("react-dom/client");
const { act } = React;

const {
  validateFiles,
  useAttachments,
  ATTACHMENT_STATUSES,
} = require("../../../app/assets/javascripts/attachments/useAttachments");
const { getAttachmentTranslations } = require("../../../app/assets/javascripts/attachments/localization");

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const copy = getAttachmentTranslations("en");

const HookHarness = ({ initialFiles, onChange }) => {
  const state = useAttachments(initialFiles, copy);
  React.useEffect(() => {
    onChange(state);
  }, [state, onChange]);
  return null;
};

describe("useAttachments and validateFiles", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  test("validateFiles detects duplicate filename against existing files", () => {
    const existingFiles = [{ id: "a", name: "duplicate.pdf", size: 123 }];
    const selectedFiles = [new File(["x"], "duplicate.pdf", { type: "application/pdf" })];

    const result = validateFiles(selectedFiles, existingFiles, copy);

    expect(result.acceptedFiles).toHaveLength(0);
    expect(result.issues).toEqual([
      "You've already uploaded this file: duplicate.pdf.",
    ]);
  });

  test("validateFiles enforces 6 MB combined size limit", () => {
    const existingFiles = [{ id: "a", name: "existing.pdf", size: 4 * 1024 * 1024 }];
    const selectedFiles = [new File(["x"], "new.pdf", { type: "application/pdf" })];

    Object.defineProperty(selectedFiles[0], "size", {
      value: 3 * 1024 * 1024,
      configurable: true,
    });

    const result = validateFiles(selectedFiles, existingFiles, copy);
    expect(result.issues).toContain("Maximum 6 MB for all files combined.");
  });

  test("validateFiles returns unique issue messages", () => {
    const selectedFiles = [
      { name: "bad.exe", size: 100 },
      { name: "bad.exe", size: 100 },
    ];

    const result = validateFiles(selectedFiles, [], copy);
    expect(result.issues).toEqual(["bad.exe has an unsupported file type."]);
  });

  test("useAttachments attaches files from API callback", async () => {
    let latestState;
    const onChange = (state) => {
      latestState = state;
    };

    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = ReactDOMClient.createRoot(container);

    act(() => {
      root.render(
        React.createElement(HookHarness, {
          initialFiles: [],
          onChange,
        }),
      );
    });

    const selectedFiles = [new File(["hello"], "hello.pdf", { type: "application/pdf" })];

    await act(async () => {
      await latestState.attachFiles(selectedFiles, async () => [
        {
          id: "server-file-id",
          status: ATTACHMENT_STATUSES.PENDING_VIRUS_SCAN,
        },
      ]);
    });

    expect(latestState.files).toHaveLength(1);
    expect(latestState.files[0].id).toBe("server-file-id");
    expect(latestState.files[0].name).toBe("hello.pdf");
    expect(latestState.pendingCount).toBe(1);

    act(() => root.unmount());
  });
});
