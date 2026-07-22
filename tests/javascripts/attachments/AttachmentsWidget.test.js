const React = require("react");
const ReactDOMClient = require("react-dom/client");
const { act } = React;

const { AttachmentsWidget } = require("../../../app/assets/javascripts/attachments/AttachmentsWidget");
const { ATTACHMENT_STATUSES } = require("../../../app/assets/javascripts/attachments/useAttachments");

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

describe("AttachmentsWidget accessibility", () => {
  const baseProps = {
    attachEndpoint: "/attach",
    removeEndpoint: "/remove",
    statusEndpoint: "/status",
    downloadEndpoint: "/download",
    csrfToken: "csrf",
    lang: "en",
    classificationUrl: "/classification",
  };

  afterEach(() => {
    document.body.innerHTML = "";
    jest.restoreAllMocks();
  });

  test("summary region is polite live region", () => {
    const { container, root } = renderComponent(
      React.createElement(AttachmentsWidget, {
        ...baseProps,
        initialFiles: [],
      }),
    );

    const summary = container.querySelector('[data-testid="attachments-summary"]');
    expect(summary.getAttribute("aria-live")).toBe("polite");
    expect(summary.textContent).toContain("No files attached");

    act(() => root.unmount());
  });

  test("button label changes from attach files to attach more files", () => {
    const withNoFiles = renderComponent(
      React.createElement(AttachmentsWidget, {
        ...baseProps,
        initialFiles: [],
      }),
    );

    expect(withNoFiles.container.textContent).toContain("Attach files");
    act(() => withNoFiles.root.unmount());

    const withFiles = renderComponent(
      React.createElement(AttachmentsWidget, {
        ...baseProps,
        initialFiles: [
          {
            id: "f1",
            name: "doc.pdf",
            file_size: 100,
            status: ATTACHMENT_STATUSES.UPLOADED,
          },
        ],
      }),
    );

    expect(withFiles.container.textContent).toContain("Attach more files");
    act(() => withFiles.root.unmount());
  });

  test("heading shows total file size from visible attachments", () => {
    const { container, root } = renderComponent(
      React.createElement(AttachmentsWidget, {
        ...baseProps,
        initialFiles: [
          {
            id: "f1",
            name: "doc-1.pdf",
            file_size: 1024,
            status: ATTACHMENT_STATUSES.UPLOADED,
          },
          {
            id: "f2",
            name: "doc-2.pdf",
            file_size: 2048,
            status: ATTACHMENT_STATUSES.PENDING_VIRUS_SCAN,
          },
          {
            id: "f3",
            name: "bad.pdf",
            file_size: 4096,
            status: ATTACHMENT_STATUSES.VIRUS_SCAN_FAILED,
          },
        ],
      }),
    );

    const heading = container.querySelector('[data-testid="attachments-heading"]');
    const totalSize = container.querySelector('[data-testid="attachments-total-size"]');

    expect(heading.textContent).toContain("Attached files");
    expect(totalSize.textContent).toBe("3.0 KB total");

    act(() => root.unmount());
  });

  test("remove action has accessible aria-label with filename", () => {
    const { container, root } = renderComponent(
      React.createElement(AttachmentsWidget, {
        ...baseProps,
        initialFiles: [
          {
            id: "f1",
            name: "document.pdf",
            file_size: 100,
            status: ATTACHMENT_STATUSES.UPLOADED,
          },
        ],
      }),
    );

    const removeButton = container.querySelector('[data-testid="attachments-remove"]');
    expect(removeButton.getAttribute("aria-label")).toBe("Remove document.pdf");

    act(() => root.unmount());
  });

  test("status summary includes scanning announcement", () => {
    const { container, root } = renderComponent(
      React.createElement(AttachmentsWidget, {
        ...baseProps,
        initialFiles: [
          {
            id: "s1",
            name: "scan-1.pdf",
            file_size: 100,
            status: ATTACHMENT_STATUSES.PENDING_VIRUS_SCAN,
          },
          {
            id: "s2",
            name: "scan-2.pdf",
            file_size: 100,
            status: ATTACHMENT_STATUSES.PENDING_VIRUS_SCAN,
          },
        ],
      }),
    );

    const summary = container.querySelector('[data-testid="attachments-summary"]');
    expect(summary.textContent).toContain("2 files scanning");

    act(() => root.unmount());
  });

  test("cancel remove returns focus to attach more files button", () => {
    const { container, root } = renderComponent(
      React.createElement(AttachmentsWidget, {
        ...baseProps,
        initialFiles: [
          {
            id: "f1",
            name: "focus.pdf",
            file_size: 100,
            status: ATTACHMENT_STATUSES.UPLOADED,
          },
        ],
      }),
    );

    const removeButton = container.querySelector('[data-testid="attachments-remove"]');
    act(() => {
      removeButton.click();
    });

    const cancelButton = container.querySelector('[data-testid="attachments-remove-cancel"]');
    const attachMoreButton = container.querySelector('[data-testid="attachments-open-modal"]');

    act(() => {
      cancelButton.click();
    });

    expect(document.activeElement).toBe(attachMoreButton);

    act(() => root.unmount());
  });
});
