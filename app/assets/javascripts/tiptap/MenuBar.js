import React, { useRef, useEffect, useCallback, useState } from "react";

/**
 * AccessibleToolbar component that wraps any toolbar content with proper ARIA accessibility.
 * Implements keyboard navigation according to WAI-ARIA toolbar pattern:
 * https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles/toolbar_role
 *
 * - Arrow keys move focus between toolbar items
 * - Home/End keys move to first/last items
 * - Tab key moves focus in/out of toolbar
 * - Uses roving tabindex for proper focus management
 */
const AccessibleToolbar = ({ children, label, editor }) => {
  const toolbarRef = useRef(null);
  const currentFocusIndexRef = useRef(0);

  // Register the toolbar DOM on the editor instance so TipTap extensions
  // can access it without DOM traversal.
  useEffect(() => {
    if (!editor || !toolbarRef.current) return;
    editor.rteToolbar = toolbarRef.current;
    return () => {
      if (editor.rteToolbar === toolbarRef.current) {
        editor.rteToolbar = null;
      }
    };
  }, [editor]);

  const getFocusableElements = useCallback(() => {
    if (!toolbarRef.current) return [];

    const focusableSelectors = [
      "button:not([disabled])",
      "[href]:not([disabled])",
      "input:not([disabled])",
      "select:not([disabled])",
      "textarea:not([disabled])",
      "[tabindex]:not([tabindex='-1']):not([disabled])",
      "[role='button']:not([disabled])",
    ].join(", ");

    return Array.from(toolbarRef.current.querySelectorAll(focusableSelectors));
  }, []);

  const updateTabIndex = useCallback(
    (focusIndex = 0) => {
      const focusableElements = getFocusableElements();

      focusableElements.forEach((element, index) => {
        element.tabIndex = index === focusIndex ? 0 : -1;
      });

      currentFocusIndexRef.current = focusIndex;
    },
    [getFocusableElements],
  );

  const moveFocus = useCallback(
    (newIndex) => {
      const focusableElements = getFocusableElements();

      if (focusableElements.length === 0) return;

      let targetIndex = newIndex;
      if (newIndex < 0) {
        targetIndex = focusableElements.length - 1;
      } else if (newIndex >= focusableElements.length) {
        targetIndex = 0;
      }

      updateTabIndex(targetIndex);
      focusableElements[targetIndex]?.focus();
    },
    [getFocusableElements, updateTabIndex],
  );

  const handleKeyDown = useCallback(
    (event) => {
      const focusableElements = getFocusableElements();
      const currentIndex = focusableElements.findIndex(
        (el) => el === event.target,
      );

      if (currentIndex === -1) return;

      switch (event.key) {
        case "ArrowRight":
        case "ArrowDown":
          event.preventDefault();
          moveFocus(currentIndex + 1);
          break;
        case "ArrowLeft":
        case "ArrowUp":
          event.preventDefault();
          moveFocus(currentIndex - 1);
          break;
        case "Home":
          event.preventDefault();
          moveFocus(0);
          break;
        case "End":
          event.preventDefault();
          moveFocus(focusableElements.length - 1);
          break;
        default:
          break;
      }
    },
    [getFocusableElements, moveFocus],
  );

  useEffect(() => {
    const focusableElements = getFocusableElements();

    if (focusableElements.length > 0) {
      updateTabIndex(0);
    }
  }, [getFocusableElements, updateTabIndex]);

  // Listen for the custom 'rte-request-focus' event (dispatched by a TipTap
  // extension when Alt+F10 is pressed). The toolbar will use its remembered
  // focus index to restore focus to the last focused toolbar item.
  useEffect(() => {
    const el = toolbarRef.current;
    if (!el) return;

    const onRequestFocus = (e) => {
      console.log('AccessibleToolbar: rte-request-focus received', el);
      if (e?.defaultPrevented) return;
      e.preventDefault?.();

      const focusableElements = getFocusableElements();
      if (focusableElements.length === 0) {
        // Make toolbar itself focusable and focus it as a fallback
        el.tabIndex = -1;
        el.focus();
        return;
      }

      // Use the remembered focus index (from currentFocusIndexRef). Ensure
      // it is within bounds; fallback to 0 if out-of-range.
      let focusIndex = currentFocusIndexRef.current || 0;
      if (focusIndex < 0 || focusIndex >= focusableElements.length) {
        focusIndex = 0;
      }

      updateTabIndex(focusIndex);
      try {
        focusableElements[focusIndex].focus();
      } catch (err) {
        // ignore focus errors
      }
    };

    el.addEventListener('rte-request-focus', onRequestFocus);
    return () => el.removeEventListener('rte-request-focus', onRequestFocus);
  }, [getFocusableElements, updateTabIndex]);

  return (
    <div
      className="toolbar"
      ref={toolbarRef}
      role="toolbar"
      aria-label={label}
      aria-keyshortcuts="Alt+F10"
      aria-orientation="horizontal"
      onKeyDown={handleKeyDown}
      data-testid="rte-toolbar"
    >
      {children}
    </div>
  );
};

const MenuBar = ({ editor, openLinkModal }) => {
  if (!editor) {
    return null;
  }

  const [liveMessage, setLiveMessage] = useState("");

  // Helper to run an editor action and announce the resulting state change.
  // To ensure screen readers read the announcement before focus returns to the
  // editor, we optimistically set the message before invoking the action.
  // We still run a deferred check to keep the message accurate if needed.
  const announceToggle = (actionFn, checkFn, label) => {
    try {
      // Optimistically announce the intended change.
      setLiveMessage(`${label} applied.`);

      // Delay invoking the action briefly so screen readers have time
      // to pick up the live region before focus returns to the editor.
      setTimeout(() => {
        actionFn();

        // Defer a verification check and correct the message if the action actually removed the state.
        setTimeout(() => {
          const active = checkFn();
          if (!active) {
            setLiveMessage(`${label} removed.`);
          }
        }, 100);
      }, 120);
    } catch (err) {
      // ignore
    }
  };

  useEffect(() => {
    if (!liveMessage) return;
    const id = setTimeout(() => setLiveMessage(""), 2500);
    return () => clearTimeout(id);
  }, [liveMessage]);

  return (
    <AccessibleToolbar label="Editor toolbar" editor={editor}>
      <div className="sr-only" role="alert" aria-atomic="true" data-testid="rte-liveregion">{liveMessage}</div>
      <div className="toolbar-group">
        <button
          data-testid="rte-heading_1"
          onClick={() =>
            announceToggle(
              () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
              () => editor.isActive("heading", { level: 1 }),
              "Heading 1",
            )
          }
          className={
            "toolbar-button" +
            (editor.isActive("heading", { level: 1 }) ? " is-active" : "")
          }
          aria-pressed={editor.isActive("heading", { level: 1 })}
        >
          <span className="sr-only">
            {editor.isActive("heading", { level: 1 })
              ? "Remove "
              : "Apply "}
          </span>
          H1
        </button>
        <button
          data-testid="rte-heading_2"
          onClick={() =>
            announceToggle(
              () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
              () => editor.isActive("heading", { level: 2 }),
              "Heading 2",
            )
          }
          className={
            "toolbar-button" +
            (editor.isActive("heading", { level: 2 }) ? " is-active" : "")
          }
          title="Heading 2"
          aria-pressed={editor.isActive("heading", { level: 2 })}
        >
          <span className="sr-only">
            {editor.isActive("heading", { level: 2 })
              ? "Remove "
              : "Apply "}
          </span>
          H2
        </button>
      </div>

      <div className="toolbar-separator"></div>

      {/* Variable group */}
      <div className="toolbar-group">
        <button
          data-testid="rte-variable"
          onClick={() =>
            announceToggle(
              () => editor.chain().focus().toggleVariable().run(),
              () => editor.isActive("variable"),
              "Variable",
            )
          }
          disabled={!editor.can().chain().focus().toggleVariable().run()}
          className={
            "toolbar-button" + (editor.isActive("variable") ? " is-active" : "")
          }
          title="Variable"
          aria-pressed={editor.isActive("variable")}
        >
          <span className="sr-only">
            {editor.isActive("variable") ? "Remove " : "Apply "}Variable
          </span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
            <path d="M5 4c-2.5 5 -2.5 10 0 16m14 -16c2.5 5 2.5 10 0 16m-10 -11h1c1 0 1 1 2.016 3.527c.984 2.473 .984 3.473 1.984 3.473h1"></path>
            <path d="M8 16c1.5 0 3 -2 4 -3.5s2.5 -3.5 4 -3.5"></path>
          </svg>
        </button>
      </div>

      <div className="toolbar-separator"></div>

      {/* Text styles group */}
      <div className="toolbar-group">
        <button
          data-testid="rte-bold"
          onClick={() =>
            announceToggle(
              () => editor.chain().focus().toggleBold().run(),
              () => editor.isActive("bold"),
              "Bold",
            )
          }
          disabled={!editor.can().chain().focus().toggleBold().run()}
          className={
            "toolbar-button" + (editor.isActive("bold") ? " is-active" : "")
          }
          title="Bold"
          aria-pressed={editor.isActive("bold")}
        >
          <span className="sr-only">
            {editor.isActive("bold") ? "Remove " : "Apply "}Bold
          </span>
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
            <path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
          </svg>
        </button>
        <button
          data-testid="rte-italic"
          onClick={() =>
            announceToggle(
              () => editor.chain().focus().toggleItalic().run(),
              () => editor.isActive("italic"),
              "Italic",
            )
          }
          disabled={!editor.can().chain().focus().toggleItalic().run()}
          className={
            "toolbar-button" + (editor.isActive("italic") ? " is-active" : "")
          }
          title="Italic"
          aria-pressed={editor.isActive("italic")}
        >
          <span className="sr-only">
            {editor.isActive("italic") ? "Remove " : "Apply "}Italic
          </span>
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <line x1="19" y1="4" x2="10" y2="4" />
            <line x1="14" y1="20" x2="5" y2="20" />
            <line x1="15" y1="4" x2="9" y2="20" />
          </svg>
        </button>
      </div>

      <div className="toolbar-separator"></div>

      {/* Lists group */}
      <div className="toolbar-group">
        <button
          data-testid="rte-bullet_list"
          onClick={() =>
            announceToggle(
              () => editor.chain().focus().toggleBulletList().run(),
              () => editor.isActive("bulletList"),
              "Bullet list",
            )
          }
          className={
            "toolbar-button" +
            (editor.isActive("bulletList") ? " is-active" : "")
          }
          title="Bullet List"
          aria-pressed={editor.isActive("bulletList")}
        >
          <span className="sr-only">
            {editor.isActive("bulletList")
              ? "Remove "
              : "Apply "}Bullet List
          </span>
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <line x1="8" y1="6" x2="21" y2="6" />
            <line x1="8" y1="12" x2="21" y2="12" />
            <line x1="8" y1="18" x2="21" y2="18" />
            <line x1="3" y1="6" x2="3.01" y2="6" />
            <line x1="3" y1="12" x2="3.01" y2="12" />
            <line x1="3" y1="18" x2="3.01" y2="18" />
          </svg>
        </button>
        <button
          data-testid="rte-numbered_list"
          onClick={() =>
            announceToggle(
              () => editor.chain().focus().toggleOrderedList().run(),
              () => editor.isActive("orderedList"),
              "Numbered list",
            )
          }
          className={
            "toolbar-button" +
            (editor.isActive("orderedList") ? " is-active" : "")
          }
          title="Numbered List"
          aria-pressed={editor.isActive("orderedList")}
        >
          <span className="sr-only">
            {editor.isActive("orderedList")
              ? "Remove "
              : "Apply "}Numbered List
          </span>
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <line x1="10" y1="6" x2="21" y2="6" />
            <line x1="10" y1="12" x2="21" y2="12" />
            <line x1="10" y1="18" x2="21" y2="18" />
            <path d="M4 6h1v4" />
            <path d="M4 10h2" />
            <path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1" />
          </svg>
        </button>
      </div>

      <div className="toolbar-separator"></div>

      {/* Link, divider, blockquote */}
      <div className="toolbar-group">
        <button
          data-testid="rte-link"
          onClick={() => {
            openLinkModal();
            // announce via live region when link modal opens (approx)
            setTimeout(() => setLiveMessage("Link dialog opened"), 0);
          }}
          className={
            "toolbar-button" + (editor.isActive("link") ? " is-active" : "")
          }
          title="Link"
          aria-pressed={editor.isActive("link")}
        >
          <span className="sr-only">
            {editor.isActive("link") ? "Remove " : "Apply "}Link
          </span>
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
        </button>
        <button
          data-testid="rte-horizontal_rule"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          className="toolbar-button"
          title="Horizontal Rule"
        >
          <span className="sr-only">Insert Horizontal Rule</span>
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <line x1="3" y1="12" x2="21" y2="12" />
          </svg>
        </button>
        <button
          data-testid="rte-blockquote"
          onClick={() =>
            announceToggle(
              () => editor.chain().focus().toggleBlockquote().run(),
              () => editor.isActive("blockquote"),
              "Blockquote",
            )
          }
          className={
            "toolbar-button" +
            (editor.isActive("blockquote") ? " is-active" : "")
          }
          title="Blockquote"
          aria-pressed={editor.isActive("blockquote")}
        >
          <span className="sr-only">
            {editor.isActive("blockquote")
              ? "Remove "
              : "Apply "}Blockquote
          </span>
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z" />
            <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z" />
          </svg>
        </button>
      </div>

      <div className="toolbar-separator"></div>

      {/* Language blocks group */}
      <div className="toolbar-group">
        <button
          data-testid="rte-english_block"
          onClick={() =>
            announceToggle(
              () => editor.chain().focus().toggleEnglishBlock().run(),
              () => editor.isActive("englishBlock"),
              "English block",
            )
          }
          className={
            "toolbar-button" +
            (editor.isActive("englishBlock") ? " is-active" : "")
          }
          title="English Block"
          aria-pressed={editor.isActive("englishBlock")}
        >
          <span className="sr-only">
            {editor.isActive("englishBlock")
              ? "Remove "
              : "Apply "}
          </span>
          EN
        </button>
        <button
          data-testid="rte-french_block"
          onClick={() =>
            announceToggle(
              () => editor.chain().focus().toggleFrenchBlock().run(),
              () => editor.isActive("frenchBlock"),
              "French block",
            )
          }
          className={
            "toolbar-button" +
            (editor.isActive("frenchBlock") ? " is-active" : "")
          }
          title="French Block"
          aria-pressed={editor.isActive("frenchBlock")}
        >
          <span className="sr-only">
            {editor.isActive("frenchBlock")
              ? "Remove "
              : "Apply "}
          </span>
          FR
        </button>
      </div>
    </AccessibleToolbar>
  );
};

export default MenuBar;
