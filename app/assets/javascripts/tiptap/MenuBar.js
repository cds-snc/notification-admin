import React, { useRef, useEffect, useCallback, useState } from "react";
import TooltipWrapper from "./TooltipWrapper";

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
const AccessibleToolbar = ({ children, label, editor, className = "" }) => {
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
          return;
        case "ArrowLeft":
          event.preventDefault();
          moveFocus(currentIndex - 1);
          return;
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
  useEffect(() => {
    const el = toolbarRef.current;
    if (!el) return;

    const onRequestFocus = (e) => {
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

    const onOpenLinkModal = (e) => {
      e.preventDefault?.();
      // Bubble an event so the outer MenuBar component (which receives editor prop) can open the modal
      try {
        const openEvent = new CustomEvent("rte-open-link-modal-forward", {
          bubbles: true,
        });
        el.dispatchEvent(openEvent);
      } catch (err) {
        // ignore
      }
    };

    el.addEventListener("rte-request-focus", onRequestFocus);
    el.addEventListener("rte-open-link-modal", onOpenLinkModal);
    return () => {
      el.removeEventListener("rte-request-focus", onRequestFocus);
      el.removeEventListener("rte-open-link-modal", onOpenLinkModal);
    };
  }, [getFocusableElements, updateTabIndex]);

  return (
    <div
      className={["toolbar", className].filter(Boolean).join(" ")}
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

const MenuBar = ({
  editor,
  openLinkModal,
  lang = "en",
  onToggleMarkdownView,
  isMarkdownView,
  toggleLabel,
}) => {
  if (!editor) {
    return null;
  }

  const [liveMessage, setLiveMessage] = useState("");
  const labels = {
    en: {
      toolbar: "Editor toolbar",
      toggleMd: "View source",
      shortcutHeading1: "⌘ + Opt + 1",
      shortcutHeading2: "⌘ + Opt + 2",
      shortcutBold: "⌘ + B",
      shortcutItalic: "⌘ + I",
      shortcutBulletList: "⌘ + Shift + 8",
      shortcutNumberedList: "⌘ + Shift + 7",
      linkDialogOpened: "Link dialog opened",
      applied: "applied.",
      removed: "removed.",
      applyPrefix: "Apply ",
      removePrefix: "Remove ",
      heading1: "Title",
      heading2: "Sub-title",
      variable: "Variable",
      bold: "Bold",
      italic: "Italic",
      bulletList: "Bullet List",
      numberedList: "Numbered List",
      link: "Link",
      horizontalRule: "Horizontal Rule",
      horizontalRuleInsert: "Insert Horizontal Rule",
      blockquote: "Blockquote",
      englishBlock: "English block",
      frenchBlock: "French block",
    },
    fr: {
      toolbar: "Barre d'outils de l'éditeur",
      toggleMd: "Voir la source",
      shortcutHeading1: "⌘ + Opt + 1",
      shortcutHeading2: "⌘ + Opt + 2",
      shortcutBold: "⌘ + B",
      shortcutItalic: "⌘ + I",
      shortcutBulletList: "⌘ + Shift + 8",
      shortcutNumberedList: "⌘ + Shift + 7",
      linkDialogOpened: "Boîte de dialogue du lien ouverte",
      applied: "appliqué.",
      removed: "supprimé.",
      applyPrefix: "Appliquer ",
      removePrefix: "Supprimer ",
      heading1: "Titre",
      heading2: "Sous-titre",
      variable: "Variable",
      bold: "Gras",
      italic: "Italique",
      bulletList: "Liste à puces",
      numberedList: "Liste numérotée",
      link: "Lien",
      horizontalRule: "Règle horizontale",
      horizontalRuleInsert: "Insérer une règle horizontale",
      blockquote: "Bloc de citation",
      englishBlock: "Bloc anglais",
      frenchBlock: "Bloc français",
    },
  };

  const t = labels[lang] || labels.en;
  const toggleButtonLabel = toggleLabel || t.toggleMd;
  const toggleHandler = onToggleMarkdownView || (() => {});

  // Platform-aware shortcut labels: use Command on macOS, Ctrl on Windows/Linux
  const getPlatform = () => {
    if (typeof navigator === "undefined" || !navigator.platform) return "other";
    const p = navigator.platform.toLowerCase();
    if (p.includes("mac")) return "mac";
    if (p.includes("win")) return "windows";
    if (p.includes("linux")) return "linux";
    return "other";
  };

  const platform = getPlatform();

  const shortcuts = {
    heading1: platform === "mac" ? "⌘+Opt+1" : "Ctrl+Alt+1",
    heading2: platform === "mac" ? "⌘+Opt+2" : "Ctrl+Alt+2",
    variable: platform === "mac" ? "⌘+Opt+3" : "Ctrl+Alt+3",
    bulletList: platform === "mac" ? "⌘+Opt+4" : "Ctrl+Alt+4",
    numberedList: platform === "mac" ? "⌘+Opt+5" : "Ctrl+Alt+5",
    horizontalRule: platform === "mac" ? "⌘+Opt+6" : "Ctrl+Alt+6",
    blockquote: platform === "mac" ? "⌘+Opt+7" : "Ctrl+Alt+7",
    englishBlock: platform === "mac" ? "⌘+Opt+8" : "Ctrl+Alt+8",
    frenchBlock: platform === "mac" ? "⌘+Opt+9" : "Ctrl+Alt+9",
    link: platform === "mac" ? "⌘+K" : "Ctrl+K",
    bold: platform === "mac" ? "⌘+Opt+B" : "Ctrl+Alt+B",
    italic: platform === "mac" ? "⌘+Opt+I" : "Ctrl+Alt+I",
  };

  // Helper to run an editor action and announce the resulting state change.
  // To ensure screen readers read the announcement before focus returns to the
  // editor, we optimistically set the message before invoking the action.
  // We still run a deferred check to keep the message accurate if needed.
  const announceToggle = (actionFn, checkFn, label) => {
    try {
      // Optimistically announce the intended change.
      setLiveMessage(`${label} ${t.applied}`);

      // Delay invoking the action briefly so screen readers have time
      // to pick up the live region before focus returns to the editor.
      setTimeout(() => {
        actionFn();

        // Defer a verification check and correct the message if the action actually removed the state.
        setTimeout(() => {
          const active = checkFn();
          if (!active) {
            setLiveMessage(`${label} ${t.removed}`);
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

  // Listen for forwarded open-link events from the toolbar (Mod+K)
  useEffect(() => {
    if (!editor || !editor.rteToolbar) return;
    const el = editor.rteToolbar;
    const onOpenLink = (e) => {
      try {
        openLinkModal();
        setLiveMessage(t.linkDialogOpened);
      } catch (err) {
        // ignore
      }
    };

    el.addEventListener("rte-open-link-modal-forward", onOpenLink);
    return () =>
      el.removeEventListener("rte-open-link-modal-forward", onOpenLink);
  }, [editor, openLinkModal, t.linkDialogOpened]);

  return (
    <AccessibleToolbar
      label={t.toolbar}
      editor={editor}
      className={isMarkdownView ? "markdown-mode" : ""}
    >
      <div
        className="sr-only"
        role="alert"
        aria-atomic="true"
        data-testid="rte-liveregion"
      >
        {liveMessage}
      </div>
      <div className="toolbar-group">
        <TooltipWrapper label={t.heading1} shortcut={shortcuts.heading1}>
          <button
            type="button"
            data-testid="rte-heading_1"
            onClick={() =>
              announceToggle(
                () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
                () => editor.isActive("heading", { level: 1 }),
                t.heading1,
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
                ? t.removePrefix
                : t.applyPrefix}
            </span>
            H1
          </button>
        </TooltipWrapper>
        <TooltipWrapper label={t.heading2} shortcut={shortcuts.heading2}>
          <button
            type="button"
            data-testid="rte-heading_2"
            onClick={() =>
              announceToggle(
                () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
                () => editor.isActive("heading", { level: 2 }),
                t.heading2,
              )
            }
            className={
              "toolbar-button" +
              (editor.isActive("heading", { level: 2 }) ? " is-active" : "")
            }
            title={t.heading2}
            aria-pressed={editor.isActive("heading", { level: 2 })}
          >
            <span className="sr-only">
              {editor.isActive("heading", { level: 2 })
                ? t.removePrefix
                : t.applyPrefix}
            </span>
            H2
          </button>
        </TooltipWrapper>
      </div>

      <div className="toolbar-separator"></div>

      {/* Variable group */}
      <div className="toolbar-group">
        <TooltipWrapper label={t.variable} shortcut={shortcuts.variable}>
          <button
            type="button"
            data-testid="rte-variable"
            onClick={() =>
              announceToggle(
                () => editor.chain().focus().toggleVariable().run(),
                () => editor.isActive("variable"),
                t.variable,
              )
            }
            disabled={!editor.can().chain().focus().toggleVariable().run()}
            className={
              "toolbar-button" +
              (editor.isActive("variable") ? " is-active" : "")
            }
            title={t.variable}
            aria-pressed={editor.isActive("variable")}
          >
            <span className="sr-only">
              {editor.isActive("variable") ? t.removePrefix : t.applyPrefix}
              {t.variable}
            </span>
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
              <path d="M5 4c-2.5 5 -2.5 10 0 16m14 -16c2.5 5 2.5 10 0 16m-10 -11h1c1 0 1 1 2.016 3.527c.984 2.473 .984 3.473 1.984 3.473h1"></path>
              <path d="M8 16c1.5 0 3 -2 4 -3.5s2.5 -3.5 4 -3.5"></path>
            </svg>
          </button>
        </TooltipWrapper>
      </div>

      <div className="toolbar-separator"></div>

      {/* Text styles group */}
      <div className="toolbar-group">
        <TooltipWrapper label={t.bold} shortcut={t.shortcutBold}>
          <button
            type="button"
            data-testid="rte-bold"
            onClick={() =>
              announceToggle(
                () => editor.chain().focus().toggleBold().run(),
                () => editor.isActive("bold"),
                t.bold,
              )
            }
            disabled={!editor.can().chain().focus().toggleBold().run()}
            className={
              "toolbar-button" + (editor.isActive("bold") ? " is-active" : "")
            }
            title={t.bold}
            aria-pressed={editor.isActive("bold")}
          >
            <span className="sr-only">
              {editor.isActive("bold") ? t.removePrefix : t.applyPrefix}
              {t.bold}
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
        </TooltipWrapper>
        <TooltipWrapper label={t.italic} shortcut={t.shortcutItalic}>
          <button
            type="button"
            data-testid="rte-italic"
            onClick={() =>
              announceToggle(
                () => editor.chain().focus().toggleItalic().run(),
                () => editor.isActive("italic"),
                t.italic,
              )
            }
            disabled={!editor.can().chain().focus().toggleItalic().run()}
            className={
              "toolbar-button" + (editor.isActive("italic") ? " is-active" : "")
            }
            title={t.italic}
            aria-pressed={editor.isActive("italic")}
          >
            <span className="sr-only">
              {editor.isActive("italic") ? t.removePrefix : t.applyPrefix}
              {t.italic}
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
        </TooltipWrapper>
      </div>

      <div className="toolbar-separator"></div>

      {/* Lists group */}
      <div className="toolbar-group">
        <TooltipWrapper label={t.bulletList} shortcut={shortcuts.bulletList}>
          <button
            type="button"
            data-testid="rte-bullet_list"
            onClick={() =>
              announceToggle(
                () => editor.chain().focus().toggleBulletList().run(),
                () => editor.isActive("bulletList"),
                t.bulletList,
              )
            }
            className={
              "toolbar-button" +
              (editor.isActive("bulletList") ? " is-active" : "")
            }
            title={t.bulletList}
            aria-pressed={editor.isActive("bulletList")}
          >
            <span className="sr-only">
              {editor.isActive("bulletList") ? t.removePrefix : t.applyPrefix}
              {t.bulletList}
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
        </TooltipWrapper>
        <TooltipWrapper
          label={t.numberedList}
          shortcut={shortcuts.numberedList}
        >
          <button
            type="button"
            data-testid="rte-numbered_list"
            onClick={() =>
              announceToggle(
                () => editor.chain().focus().toggleOrderedList().run(),
                () => editor.isActive("orderedList"),
                t.numberedList,
              )
            }
            className={
              "toolbar-button" +
              (editor.isActive("orderedList") ? " is-active" : "")
            }
            title={t.numberedList}
            aria-pressed={editor.isActive("orderedList")}
          >
            <span className="sr-only">
              {editor.isActive("orderedList") ? t.removePrefix : t.applyPrefix}
              {t.numberedList}
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
        </TooltipWrapper>
      </div>

      <div className="toolbar-separator"></div>

      {/* Link, divider, blockquote */}
      <div className="toolbar-group">
        <TooltipWrapper label={t.link} shortcut={shortcuts.link}>
          <button
            type="button"
            data-testid="rte-link"
            onClick={() => {
              openLinkModal();
              // announce via live region when link modal opens (approx)
              setTimeout(() => setLiveMessage(t.linkDialogOpened), 0);
            }}
            className={
              "toolbar-button" + (editor.isActive("link") ? " is-active" : "")
            }
            title={t.link}
            aria-pressed={editor.isActive("link")}
          >
            <span className="sr-only">
              {editor.isActive("link") ? t.removePrefix : t.applyPrefix}
              {t.link}
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
        </TooltipWrapper>
        <TooltipWrapper
          label={t.horizontalRule}
          shortcut={shortcuts.horizontalRule}
        >
          <button
            type="button"
            data-testid="rte-horizontal_rule"
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            className="toolbar-button"
            title={t.horizontalRule}
          >
            <span className="sr-only">{t.horizontalRuleInsert}</span>
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
        </TooltipWrapper>

        <TooltipWrapper label={t.blockquote} shortcut={shortcuts.blockquote}>
          <button
            type="button"
            data-testid="rte-blockquote"
            onClick={() =>
              announceToggle(
                () => editor.chain().focus().toggleBlockquote().run(),
                () => editor.isActive("blockquote"),
                t.blockquote,
              )
            }
            className={
              "toolbar-button" +
              (editor.isActive("blockquote") ? " is-active" : "")
            }
            title={t.blockquote}
            aria-pressed={editor.isActive("blockquote")}
          >
            <span className="sr-only">
              {editor.isActive("blockquote") ? t.removePrefix : t.applyPrefix}
              {t.blockquote}
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
        </TooltipWrapper>
      </div>

      <div className="toolbar-separator"></div>

      {/* Language blocks group */}
      <div className="toolbar-group">
        <TooltipWrapper
          label={t.englishBlock}
          shortcut={shortcuts.englishBlock}
        >
          <button
            type="button"
            data-testid="rte-english_block"
            onClick={() =>
              announceToggle(
                () => editor.chain().focus().toggleEnglishBlock().run(),
                () => editor.isActive("englishBlock"),
                t.englishBlock,
              )
            }
            className={
              "toolbar-button" +
              (editor.isActive("englishBlock") ? " is-active" : "")
            }
            title={t.englishBlock}
            aria-pressed={editor.isActive("englishBlock")}
          >
            <span className="sr-only">
              {editor.isActive("englishBlock") ? t.removePrefix : t.applyPrefix}
              {t.englishBlock}
            </span>
            EN
          </button>
        </TooltipWrapper>
        <TooltipWrapper label={t.frenchBlock} shortcut={shortcuts.frenchBlock}>
          <button
            type="button"
            data-testid="rte-french_block"
            onClick={() =>
              announceToggle(
                () => editor.chain().focus().toggleFrenchBlock().run(),
                () => editor.isActive("frenchBlock"),
                t.frenchBlock,
              )
            }
            className={
              "toolbar-button" +
              (editor.isActive("frenchBlock") ? " is-active" : "")
            }
            title={t.frenchBlock}
            aria-pressed={editor.isActive("frenchBlock")}
          >
            <span className="sr-only">
              {editor.isActive("frenchBlock") ? t.removePrefix : t.applyPrefix}
              {t.frenchBlock}
            </span>
            FR
          </button>
        </TooltipWrapper>
      </div>
      <div className="toolbar-separator"></div>

      {/* Markdown toggle group */}
      <div className="toolbar-group toolbar-switch-group">
        <TooltipWrapper label={toggleButtonLabel}>
          <button
            type="button"
            data-testid="rte-toggle-markdown"
            onClick={toggleHandler}
            className={"toolbar-button" + (isMarkdownView ? " is-active" : "")}
            title={toggleButtonLabel}
            aria-pressed={isMarkdownView}
          >
            <span className="sr-only">{toggleButtonLabel}</span>
            {isMarkdownView ? (
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
                className="icon icon-tabler icons-tabler-outline icon-tabler-file-arrow-left"
                aria-hidden="true"
              >
                <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
                <path d="M14 3v4a1 1 0 0 0 1 1h4"></path>
                <path d="M17 21h-10a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2z"></path>
                <path d="M15 15h-6"></path>
                <path d="M11.5 17.5l-2.5 -2.5l2.5 -2.5"></path>
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
                <path d="M7 8l-4 4l4 4"></path>
                <path d="M17 8l4 4l-4 4"></path>
                <path d="M14 4l-4 16"></path>
              </svg>
            )}
          </button>
        </TooltipWrapper>
      </div>
    </AccessibleToolbar>
  );
};

export default MenuBar;
