import React, { useRef, useEffect, useCallback } from "react";

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
const AccessibleToolbar = ({ children, label }) => {
  const toolbarRef = useRef(null);
  const currentFocusIndexRef = useRef(0);

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

  const updateTabIndex = useCallback((focusIndex = 0) => {
    const focusableElements = getFocusableElements();

    focusableElements.forEach((element, index) => {
      element.tabIndex = index === focusIndex ? 0 : -1;
    });

    currentFocusIndexRef.current = focusIndex;
  }, [getFocusableElements]);

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
    [getFocusableElements, updateTabIndex]
  );

  const handleKeyDown = useCallback(
    (event) => {
      const focusableElements = getFocusableElements();
      const currentIndex = focusableElements.findIndex((el) => el === event.target);

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
    [getFocusableElements, moveFocus]
  );

  useEffect(() => {
    const focusableElements = getFocusableElements();

    if (focusableElements.length > 0) {
      updateTabIndex(0);
    }
  }, [getFocusableElements, updateTabIndex]);

  return (
    <div
      className="toolbar"
      ref={toolbarRef}
      role="toolbar"
      aria-label={label}
      onKeyDown={handleKeyDown}
    >
      {children}
    </div>
  );
};

const MenuBar = ({ editor, openLinkModal }) => {
  if (!editor) {
    return null;
  }

  return (
    <AccessibleToolbar label="Editor toolbar">
      <div className="toolbar-group">
        <button
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 1 }).run()
          }
          className={
            "toolbar-button" +
            (editor.isActive("heading", { level: 1 }) ? " is-active" : "")
          }
          title="Heading 1"
        >
          {editor.isActive("heading", { level: 1 }) ? "Remove Heading 1" : "Apply Heading 1"}
        </button>
        <button
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
          className={
            "toolbar-button" +
            (editor.isActive("heading", { level: 2 }) ? " is-active" : "")
          }
          title="Heading 2"
        >
          <span className="sr-only">
            {editor.isActive("heading", { level: 2 }) ? "Remove Heading 2" : "Apply Heading 2"}
          </span>
          H2
        </button>
      </div>

      <div className="toolbar-separator"></div>

      {/* Variable group */}
      <div className="toolbar-group">
        <button
          onClick={() => editor.chain().focus().toggleVariable().run()}
          disabled={!editor.can().chain().focus().toggleVariable().run()}
          className={
            "toolbar-button" + (editor.isActive("variable") ? " is-active" : "")
          }
          title="Variable"
        >
          <span className="sr-only">
            {editor.isActive("variable") ? "Remove Variable" : "Apply Variable"}
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
          onClick={() => editor.chain().focus().toggleBold().run()}
          disabled={!editor.can().chain().focus().toggleBold().run()}
          className={
            "toolbar-button" + (editor.isActive("bold") ? " is-active" : "")
          }
          title="Bold"
        >
          <span className="sr-only">
            {editor.isActive("bold") ? "Remove Bold" : "Apply Bold"}
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
          onClick={() => editor.chain().focus().toggleItalic().run()}
          disabled={!editor.can().chain().focus().toggleItalic().run()}
          className={
            "toolbar-button" + (editor.isActive("italic") ? " is-active" : "")
          }
          title="Italic"
        >
          <span className="sr-only">
            {editor.isActive("italic") ? "Remove Italic" : "Apply Italic"}
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
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={
            "toolbar-button" +
            (editor.isActive("bulletList") ? " is-active" : "")
          }
          title="Bullet List"
        >
          <span className="sr-only">
            {editor.isActive("bulletList") ? "Remove Bullet List" : "Apply Bullet List"}
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
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={
            "toolbar-button" +
            (editor.isActive("orderedList") ? " is-active" : "")
          }
          title="Numbered List"
        >
          <span className="sr-only">
            {editor.isActive("orderedList") ? "Remove Numbered List" : "Apply Numbered List"}
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
          onClick={openLinkModal}
          className={
            "toolbar-button" + (editor.isActive("link") ? " is-active" : "")
          }
          title="Link"
        >
          <span className="sr-only">
            {editor.isActive("link") ? "Remove Link" : "Apply Link"}
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
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          className="toolbar-button"
          title="Horizontal Rule"
        >
          <span className="sr-only">Apply Horizontal Rule</span>
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
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={
            "toolbar-button" +
            (editor.isActive("blockquote") ? " is-active" : "")
          }
          title="Blockquote"
        >
          <span className="sr-only">
            {editor.isActive("blockquote") ? "Remove Blockquote" : "Apply Blockquote"}
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
          onClick={() => editor.chain().focus().toggleEnglishBlock().run()}
          className={
            "toolbar-button" +
            (editor.isActive("englishBlock") ? " is-active" : "")
          }
          title="English Block"
        >
          <span className="sr-only">
            {editor.isActive("englishBlock") ? "Remove English Block" : "Apply English Block"}
          </span>
          EN
        </button>
        <button
          onClick={() => editor.chain().focus().toggleFrenchBlock().run()}
          className={
            "toolbar-button" +
            (editor.isActive("frenchBlock") ? " is-active" : "")
          }
          title="French Block"
        >
          <span className="sr-only">
            {editor.isActive("frenchBlock") ? "Remove French Block" : "Apply French Block"}
          </span>
          FR
        </button>
      </div>
    </AccessibleToolbar>
  );
};

export default MenuBar;