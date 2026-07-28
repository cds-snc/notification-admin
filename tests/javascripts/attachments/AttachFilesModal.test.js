const React = require("react");
const ReactDOMClient = require("react-dom/client");
const { act } = React;

const { AttachFilesModal } = require("../../../app/assets/javascripts/attachments/AttachFilesModal");
const { getAttachmentTranslations } = require("../../../app/assets/javascripts/attachments/localization");

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const renderComponent = (element) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = ReactDOMClient.createRoot(container);

  act(() => {
    root.render(element);
  });

  return { container, root };
};

const selectFiles = (input, files) => {
  Object.defineProperty(input, "files", {
    value: files,
    writable: false,
    configurable: true,
  });

  act(() => {
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
};

describe("AttachFilesModal accessibility", () => {
  const copy = getAttachmentTranslations("en");

  afterEach(() => {
    document.body.innerHTML = "";
    jest.clearAllMocks();
  });

  test("renders polite live region for announcements", () => {
    const onClose = jest.fn();
    const { container, root } = renderComponent(
      React.createElement(AttachFilesModal, {
        isOpen: true,
        issues: [],
        copy,
        onIssuesChange: jest.fn(),
        onValidateSelection: () => ({ acceptedFiles: [], issues: [] }),
        onClose,
        onAttach: jest.fn(),
      }),
    );

    const liveRegion = container.querySelector('[aria-live="polite"]');
    expect(liveRegion).toBeTruthy();

    act(() => root.unmount());
  });

  test("closes panel on Escape key", () => {
    const onClose = jest.fn();
    const { container, root } = renderComponent(
      React.createElement(AttachFilesModal, {
        isOpen: true,
        issues: [],
        copy,
        onIssuesChange: jest.fn(),
        onValidateSelection: () => ({ acceptedFiles: [], issues: [] }),
        onClose,
        onAttach: jest.fn(),
      }),
    );

    const panel = container.querySelector('[data-testid="attachments-panel"]');
    act(() => {
      panel.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
      );
    });

    expect(onClose).toHaveBeenCalledTimes(1);
    act(() => root.unmount());
  });

  test("links file input to errors via aria-describedby", () => {
    const onClose = jest.fn();
    const issues = ["Maximum 6 MB for all files combined."];
    const { container, root } = renderComponent(
      React.createElement(AttachFilesModal, {
        isOpen: true,
        issues,
        copy,
        onIssuesChange: jest.fn(),
        onValidateSelection: () => ({ acceptedFiles: [], issues }),
        onClose,
        onAttach: jest.fn(),
      }),
    );

    const input = container.querySelector('[data-testid="attachments-file-input"]');
    const errors = container.querySelector("#attachment-errors");

    expect(errors.textContent).toContain("Error:");
    expect(input.getAttribute("aria-describedby")).toBe("attachment-errors");
    expect(errors.textContent).toContain("Maximum 6 MB for all files combined.");

    act(() => root.unmount());
  });

  test("shows selected file and remove button label", () => {
    const onClose = jest.fn();
    const onIssuesChange = jest.fn();
    const onValidateSelection = jest.fn((files) => ({ acceptedFiles: files, issues: [] }));

    const { container, root } = renderComponent(
      React.createElement(AttachFilesModal, {
        isOpen: true,
        issues: [],
        copy,
        onIssuesChange,
        onValidateSelection,
        onClose,
        onAttach: jest.fn(),
      }),
    );

    const input = container.querySelector('[data-testid="attachments-file-input"]');
    const file = new File(["abc"], "test.pdf", { type: "application/pdf" });

    selectFiles(input, [file]);

    const pendingList = container.querySelector('[data-testid="pending-files-list"]');
    const removeButton = container.querySelector('[data-testid="attachments-pending-remove"]');

    expect(onValidateSelection).toHaveBeenCalled();
    expect(onIssuesChange).toHaveBeenCalledWith([]);
    expect(pendingList.textContent).toContain("test.pdf");
    expect(pendingList.textContent).toContain("3 B");
    expect(removeButton.getAttribute("aria-label")).toBe("Remove test.pdf");

    act(() => root.unmount());
  });

  test("submits selected files through onAttach", async () => {
    const onAttach = jest.fn(async () => {});
    const { container, root } = renderComponent(
      React.createElement(AttachFilesModal, {
        isOpen: true,
        issues: [],
        copy,
        onIssuesChange: jest.fn(),
        onValidateSelection: (files) => ({ acceptedFiles: files, issues: [] }),
        onClose: jest.fn(),
        onAttach,
      }),
    );

    const input = container.querySelector('[data-testid="attachments-file-input"]');
    const file = new File(["abc"], "send-me.pdf", { type: "application/pdf" });
    selectFiles(input, [file]);

    const submitButton = container.querySelector('[data-testid="attachments-submit"]');

    await act(async () => {
      submitButton.click();
    });

    expect(onAttach).toHaveBeenCalledTimes(1);
    expect(onAttach.mock.calls[0][0]).toHaveLength(1);
    expect(onAttach.mock.calls[0][0][0].name).toBe("send-me.pdf");

    act(() => root.unmount());
  });

  test("prevents selecting the same file twice in the same modal session", () => {
    const onIssuesChange = jest.fn();
    const { container, root } = renderComponent(
      React.createElement(AttachFilesModal, {
        isOpen: true,
        issues: [],
        copy,
        onIssuesChange,
        onValidateSelection: (files) => ({ acceptedFiles: files, issues: [] }),
        onClose: jest.fn(),
        onAttach: jest.fn(),
      }),
    );

    const input = container.querySelector('[data-testid="attachments-file-input"]');
    const file = new File(["abc"], "duplicate.pdf", { type: "application/pdf" });

    // First selection should succeed
    selectFiles(input, [file]);
    expect(onIssuesChange).toHaveBeenLastCalledWith([]);

    // Second selection of the same file should trigger a duplicate error
    selectFiles(input, [file]);
    const lastCall = onIssuesChange.mock.calls[onIssuesChange.mock.calls.length - 1][0];
    expect(lastCall.some((issue) => issue.includes("duplicate.pdf"))).toBe(true);

    // Verify the file list still only has one file
    const pendingList = container.querySelector('[data-testid="pending-files-list"]');
    const items = pendingList.querySelectorAll("li");
    expect(items).toHaveLength(1);

    act(() => root.unmount());
  });
});
