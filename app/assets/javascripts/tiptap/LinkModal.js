import React, { useState, useRef, useEffect } from "react";
import { ExternalLink, Unlink, Check } from "lucide-react";
import TooltipWrapper from "./TooltipWrapper";

const LinkModal = ({
  editor,
  isVisible,
  position,
  onClose,
  outline,
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
    let formattedUrl = url;
    // If the URL looks like a variable marker (e.g. contains '((') or
    // already contains a protocol or mailto, do not prepend a protocol.
    if (url && !/^(https?:\/\/|mailto:)/i.test(url) && !/\(\(/.test(url)) {
      formattedUrl = `https://${url}`;
    }

    if (formattedUrl) {
      editor
        .chain()
        .focus()
        .extendMarkRange("link")
        .setLink({ href: formattedUrl })
        .run();

      try {
        if (typeof onSavedLink === "function") {
          onSavedLink(editor.getAttributes("link").href || null);
        }
      } catch (e) {
        console.error(
          "[LinkModal] Error in onSavedLink callback (link saved):",
          e,
        );
      }
    } else {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      try {
        if (typeof onSavedLink === "function") {
          onSavedLink(null);
        }
      } catch (e) {
        console.error(
          "[LinkModal] Error in onSavedLink callback (link unset):",
          e,
        );
      }
    }
    onClose();
  };

  // Open the current URL in a new tab. Used by the "Go to Link" control.
  const goToLink = () => {
    if (url) {
      window.open(url, "_blank");
    }
  };

  // Remove the link mark from the current selection and close the modal.
  const removeLink = () => {
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
    try {
      if (typeof onSavedLink === "function") {
        onSavedLink(null);
      }
    } catch (e) {
      console.error(
        "[LinkModal] Error in onSavedLink callback (link removed):",
        e,
      );
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
      className="link-modal"
      style={{ top: position.top, left: position.left }}
      data-testid="link-modal"
    >
      {/* {outline && (
        <div
          className="fixed border-2 border-dashed border-blue-500 pointer-events-none bg-blue-500/10"
          style={{
            width: outline.width + 4,
            height: outline.height,
            left: outline.left - 2,
            top: position.top - outline.height - 8,
          }}
          aria-hidden="true"
        ></div>
      )} */}
      <label htmlFor="link-input" className="sr-only">
        {labelText}
      </label>
      <input
        id="link-input"
        ref={inputRef}
        type="text"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        onKeyDown={handleInputKeyDown} // Scoped Enter key handling
        placeholder={t.placeholder}
        className="form-control w-full min-h-target input"
        data-testid="link-modal-input"
      />
      <TooltipWrapper label={t.save}>
        <button
          onClick={saveLink}
          title={t.save}
          aria-label={t.save}
          className="toolbar-button toolbar-green"
          data-testid="link-modal-save-button"
        >
          <Check />
        </button>
      </TooltipWrapper>
      <TooltipWrapper label={t.goTo}>
        <button
          onClick={goToLink}
          onKeyDown={(e) => e.key === "Enter" && goToLink()} // Handle Enter for Go to Link
          title={t.goTo}
          aria-label={t.goTo}
          className="toolbar-button"
          data-testid="link-modal-go-to-button"
        >
          <ExternalLink />
        </button>
      </TooltipWrapper>
      <TooltipWrapper label={t.remove}>
        <button
          onClick={removeLink}
          onKeyDown={(e) => e.key === "Enter" && removeLink()} // Handle Enter for Remove Link
          title={t.remove}
          aria-label={t.remove}
          className="toolbar-button"
          data-testid="link-modal-remove-button"
        >
          <Unlink />
        </button>
      </TooltipWrapper>
    </div>
  );
};

export default LinkModal;
