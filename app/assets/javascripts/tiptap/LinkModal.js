import React, { useState, useRef, useEffect } from "react";
import TooltipWrapper from "./TooltipWrapper";

const LinkModal = ({
  editor,
  isVisible,
  position,
  onClose,
  lang = "en",
  justOpened = false,
  onSavedLink = () => {},
}) => {
  const [url, setUrl] = useState("");
  const modalRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    // When the modal becomes visible, populate the input with the current
    // link href (if any) from the editor's selection and move keyboard
    // focus to the input. Using a short timeout ensures focus occurs after
    // the modal is mounted into the DOM.
    if (isVisible) {
      const currentUrl = editor.getAttributes("link").href || "";
      console.log("[LinkModal] Modal opened with current URL:", currentUrl);
      setUrl(currentUrl);

      // Focus on the input field when the modal becomes visible
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    }
  }, [isVisible, editor]);

  // Keep the modal open only while the selection still represents a link.
  // We listen to editor transactions so that if the user moves the cursor,
  // changes the selection, or the link mark is removed by other commands,
  // the modal will close automatically. This prevents the modal from
  // becoming detached from the current editor state.
  useEffect(() => {
    const initialSel = {
      from: editor.state.selection.from,
      to: editor.state.selection.to,
    };

    const handleEditorTransaction = () => {
      const { from, to } = editor.state.selection;

      // Close the modal when the editor selection actually changes from the
      // selection that was present when the modal opened. This allows the
      // modal to remain open for creating a new link (when there is no link
      // mark yet) but will close if the user moves the caret or changes
      // the selection.
      if (from !== initialSel.from || to !== initialSel.to) {
        onClose();
      }
    };

    if (isVisible) {
      editor.on("transaction", handleEditorTransaction);
    }

    return () => {
      editor.off("transaction", handleEditorTransaction);
    };
  }, [isVisible, editor, onClose]);

  // Handle global keyboard interactions while the modal is visible.
  // Specifically, pressing Escape should close the modal and return focus
  // to the editor so keyboard users can continue editing without extra
  // clicks. We attach the listener on `window` so that Escape is handled
  // even if focus is currently inside the input.
  useEffect(() => {
    if (isVisible) {
      const handleKeyDown = (event) => {
        if (event.key === "Escape") {
          onClose();
          editor.commands.focus(); // Restore focus to the editor
        }
      };

      window.addEventListener("keydown", handleKeyDown);

      return () => {
        window.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [isVisible, onClose, editor]);

  // When the user presses Enter inside the input, save the link and close
  // the modal. This keeps the input behavior consistent with typical form
  // patterns and prevents the Enter key from leaving the modal unexpectedly.
  const handleInputKeyDown = (event) => {
    if (event.key === "Enter") {
      saveLink();
    }
  };

  // Persist the current URL into the editor as a `link` mark. If the input
  // is empty we unset the link mark. We also normalize URLs that don't start
  // with a protocol by prepending `https://` — this mirrors common UX in
  // editors and reduces user friction. After applying the change we close
  // the modal and restore focus handling to the editor.
  const saveLink = () => {
    console.log("[LinkModal] saveLink called with URL:", url);
    let formattedUrl = url;
    if (url && !/^(https?:\/\/|mailto:)/i.test(url)) {
      console.log("[LinkModal] No protocol detected, prepending https://");
      formattedUrl = `https://${url}`;
    } else if (url && /\(\(/.test(url)) {
      console.log("[LinkModal] Variable marker detected, keeping URL as-is");
    }
    console.log("[LinkModal] Formatted URL:", formattedUrl);

    if (formattedUrl) {
      editor
        .chain()
        .focus()
        .extendMarkRange("link")
        .setLink({ href: formattedUrl })
        .run();
      console.log("[LinkModal] Link saved to editor");
      try {
        if (typeof onSavedLink === "function") {
          onSavedLink(editor.getAttributes("link").href || null);
        }
      } catch (e) {
        console.error("[LinkModal] Error in onSavedLink callback (link saved):", e);
      }
    } else {
      console.log("[LinkModal] Empty URL, unsetting link");
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      try {
        if (typeof onSavedLink === "function") {
          onSavedLink(null);
        }
      } catch (e) {
        console.error("[LinkModal] Error in onSavedLink callback (link unset):", e);
      }
    }
    onClose();
  };

  // Open the current URL in a new tab. Used by the "Go to Link" control.
  const goToLink = () => {
    console.log("[LinkModal] goToLink called with URL:", url);
    if (url) {
      window.open(url, "_blank");
    }
  };

  // Remove the link mark from the current selection and close the modal.
  const removeLink = () => {
    console.log("[LinkModal] removeLink called");
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
    try {
      if (typeof onSavedLink === "function") {
        onSavedLink(null);
      }
    } catch (e) {
      console.error("[LinkModal] Error in onSavedLink callback (link removed):", e);
    }
    onClose();
  };

  if (!isVisible) return null;
  const labels = {
    en: {
      enterLink: "Enter link address",
      placeholder: "Enter URL",
      save: "Save",
      goTo: "Go to Link",
      remove: "Remove Link",
    },
    fr: {
      enterLink: "Entrez l'adresse du lien",
      placeholder: "Entrez l'URL",
      save: "Enregistrer",
      goTo: "Aller au lien",
      remove: "Supprimer le lien",
    },
  };

  const t = labels[lang] || labels.en;

  // When the modal just opened, include announcement in label for screen readers
  const labelText = justOpened
    ? `Link editor opened. ${t.enterLink}`
    : t.enterLink;

  return (
    <div
      ref={modalRef}
      className="fixed bg-white border border-gray-300 rounded-lg p-2 z-50 flex items-center space-x-2 link-modal"
      style={{ top: position.top, left: position.left }}
      data-testid="link-modal"
    >
      <label htmlFor="link-input" className="sr-only">
        {labelText}
      </label>
      <input
        id="link-input"
        ref={inputRef}
        type="text"
        value={url}
        onChange={(e) => {
          console.log("[LinkModal] URL input changed:", e.target.value);
          setUrl(e.target.value);
        }}
        onKeyDown={handleInputKeyDown} // Scoped Enter key handling
        placeholder={t.placeholder}
        className="w-48 p-1 border border-gray-300 rounded input focus:shadow-outline"
        data-testid="link-modal-input"
      />
      <TooltipWrapper label={t.save}>
        <button
          onClick={saveLink}
          title={t.save}
          aria-label={t.save}
          className="p-1 hover:bg-gray-100 rounded"
          data-testid="link-modal-save-button"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
            <path d="M6 4h10l4 4v10a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2v-12a2 2 0 0 1 2 -2"></path>
            <path d="M12 14m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"></path>
            <path d="M14 4l0 4l-6 0l0 -4"></path>
          </svg>
        </button>
      </TooltipWrapper>
      <TooltipWrapper label={t.goTo}>
        <button
          onClick={goToLink}
          onKeyDown={(e) => e.key === "Enter" && goToLink()} // Handle Enter for Go to Link
          title={t.goTo}
          aria-label={t.goTo}
          className="p-1 hover:bg-gray-100 rounded"
          data-testid="link-modal-go-to-button"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
            <path d="M12 6h-6a2 2 0 0 0 -2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-6"></path>
            <path d="M11 13l9 -9"></path>
            <path d="M15 4h5v5"></path>
          </svg>
        </button>
      </TooltipWrapper>
      <TooltipWrapper label={t.remove}>
        <button
          onClick={removeLink}
          onKeyDown={(e) => e.key === "Enter" && removeLink()} // Handle Enter for Remove Link
          title={t.remove}
          aria-label={t.remove}
          className="p-1 hover:bg-gray-100 rounded"
          data-testid="link-modal-remove-button"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
            <path d="M4 7l16 0"></path>
            <path d="M10 11l0 6"></path>
            <path d="M14 11l0 6"></path>
            <path d="M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2 -2l1 -12"></path>
            <path d="M9 7v-3a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v3"></path>
          </svg>
        </button>
      </TooltipWrapper>
    </div>
  );
};

export default LinkModal;
