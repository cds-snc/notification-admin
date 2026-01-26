import React, { useRef, useEffect, useCallback, useState } from "react";
import {
  Icon,
  Heading1,
  Heading2,
  Minus,
  Bold,
  Italic,
  Link,
  Unlink,
  List,
  ListOrdered,
  TextQuote,
  CircleQuestionMark,
  Eye,
} from "lucide-react";
import TooltipWrapper from "./TooltipWrapper";
import { NodeSelection } from "@tiptap/pm/state";

// Custom icon nodes for TipTap editor
const variableIcon = [
  [
    "ellipse",
    {
      cx: "12",
      cy: "12",
      rx: "7.2",
      ry: "9.6",
      fill: "#ffbf47",
      stroke: "none",
    },
  ],
  [
    "path",
    {
      d: "M8 21C8 21 4 18 4 12C4 6 8 3 8 3M16 3C16 3 20 6 20 12C20 18 16 21 16 21M15 9L9 15M9 9L15 15",
      stroke: "currentColor",
      strokeWidth: "2",
      fill: "none",
    },
  ],
];

const englishBlockIcon = [
  [
    "path",
    {
      d: "M10 6H5C4.44772 6 4 6.44772 4 7V12M10 18H5C4.44772 18 4 17.5523 4 17V12M8 12H4M13 18V6.30902C13 6.13835 13.1384 6 13.309 6C13.4261 6 13.5331 6.06613 13.5854 6.17082L19.4146 17.8292C19.4669 17.9339 19.5739 18 19.691 18C19.8616 18 20 17.8616 20 17.691V6",
    },
  ],
];

const frenchBlockIcon = [
  [
    "path",
    {
      d: "M4 18V12M10 6H5C4.44772 6 4 6.44772 4 7V12M8 12H4M13 12V7C13 6.44772 13.4477 6 14 6H17C18.6569 6 20 7.34315 20 9C20 10.6569 18.6569 12 17 12H16M13 12V18M13 12H16M20 18L16 12",
    },
  ],
];

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
  useUnifiedConditionalButton = false,
}) => {
  if (!editor) {
    return null;
  }

  const [liveMessage, setLiveMessage] = useState("");
  const labels = {
    en: {
      toolbar: "Editor toolbar",
      toggleMd: "View source",
      shortcutBold: "⌘+B",
      shortcutItalic: "⌘+I",
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
      conditionalBlock: "Conditional block",
      conditionalInline: "Inline conditional",
      conditional: "Conditional",
      rtlBlock: "Display right-to-left",
    },
    fr: {
      toolbar: "Barre d'outils de l'éditeur",
      toggleMd: "Voir la source",
      shortcutBold: "⌘+B",
      shortcutItalic: "⌘+I",
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
      conditionalBlock: "Bloc conditionnel",
      conditionalInline: "Conditionnel en ligne",
      conditional: "Conditionnel",
      rtlBlock: "Afficher de droite à gauche",
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
    conditionalBlock: platform === "mac" ? "⌘+Opt+0" : "Ctrl+Alt+0",
    conditionalInline: platform === "mac" ? "⌘+Shift+0" : "Ctrl+Shift+0",
    rtlBlock: platform === "mac" ? "⌘+Opt+R" : "Ctrl+Alt+R",
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

  const selectionSpansMultipleBlocks = () => {
    try {
      const { selection } = editor.state;
      if (!selection) return false;

      // NodeSelection (selecting a block/node) should use the block conditional.
      if (selection.node) return true;

      if (selection.empty) return false;
      const { $from, $to } = selection;
      return !$from.sameParent($to);
    } catch {
      return false;
    }
  };

  const runBlockConditionalAction = () => {
    // Match existing block button behaviour.
    if (editor.isActive("conditional")) {
      return editor.chain().focus().unsetConditional().run();
    }

    const didWrap = editor.chain().focus().wrapInConditional().run();
    if (didWrap) return true;

    return editor.chain().focus().insertConditionalPattern().run();
  };

  const runInlineConditionalAction = () => {
    const getFocusedInlineConditionalPos = () => {
      try {
        const doc = editor?.view?.dom?.ownerDocument || document;
        const active = doc.activeElement;
        if (!active) return null;

        const isInlineInput =
          active.classList?.contains("conditional-inline-condition-input") ||
          active.matches?.(
            "input.conditional-inline-condition-input[data-editor-focusable]",
          );
        if (!isInlineInput) return null;

        const nodeEl = active.closest?.('span[data-type="conditional-inline"]');
        if (!nodeEl) return null;

        const pos = editor.view.posAtDOM(nodeEl, 0);
        return typeof pos === "number" ? pos : null;
      } catch {
        return null;
      }
    };

    const removeFocusedInlineConditional = (pos) => {
      try {
        if (typeof pos !== "number") return false;
        const { state, view } = editor;
        const tr = state.tr.setSelection(NodeSelection.create(state.doc, pos));
        view.dispatch(tr);
        editor.commands.unsetConditionalInline();
        editor.commands.focus();
        return true;
      } catch {
        return false;
      }
    };

    // Match existing inline button behaviour.
    const focusedPos = getFocusedInlineConditionalPos();
    if (typeof focusedPos === "number") {
      return removeFocusedInlineConditional(focusedPos);
    }

    if (editor.isActive("conditionalInline")) {
      return editor.chain().focus().unsetConditionalInline().run();
    }

    return editor.commands.setConditionalInline("condition");
  };

  const runUnifiedConditionalAction = () => {
    const getFocusedInlineConditionalPos = () => {
      try {
        const doc = editor?.view?.dom?.ownerDocument || document;
        const active = doc.activeElement;
        if (!active) return null;

        const isInlineInput =
          active.classList?.contains("conditional-inline-condition-input") ||
          active.matches?.(
            "input.conditional-inline-condition-input[data-editor-focusable]",
          );
        if (!isInlineInput) return null;

        const nodeEl = active.closest?.('span[data-type="conditional-inline"]');
        if (!nodeEl) return null;

        const pos = editor.view.posAtDOM(nodeEl, 0);
        return typeof pos === "number" ? pos : null;
      } catch {
        return null;
      }
    };

    const removeFocusedInlineConditional = (pos) => {
      try {
        if (typeof pos !== "number") return false;
        const { state, view } = editor;
        const tr = state.tr.setSelection(NodeSelection.create(state.doc, pos));
        view.dispatch(tr);
        editor.commands.unsetConditionalInline();
        editor.commands.focus();
        return true;
      } catch {
        return false;
      }
    };

    // If we're inside an existing conditional, treat this as "remove" first.
    if (editor.isActive("conditional")) {
      return editor.chain().focus().unsetConditional().run();
    }

    const focusedPos = getFocusedInlineConditionalPos();
    if (typeof focusedPos === "number") {
      return removeFocusedInlineConditional(focusedPos);
    }

    if (editor.isActive("conditionalInline")) {
      return editor.chain().focus().unsetConditionalInline().run();
    }

    if (selectionSpansMultipleBlocks()) {
      return runBlockConditionalAction();
    }

    return runInlineConditionalAction();
  };

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

      {/* Structuring elements group: Headings, Horizontal Rule */}
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
            <Heading1 />
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
            <Heading2 />
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
            <Minus />
          </button>
        </TooltipWrapper>
      </div>

      <div className="toolbar-separator"></div>

      {/* Inline formats group: Bold, Italic, Variable, Links */}
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
            <Bold />
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
            <Italic />
          </button>
        </TooltipWrapper>
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
            <Link />
          </button>
        </TooltipWrapper>
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
            <Icon
              iconNode={variableIcon}
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            />
          </button>
        </TooltipWrapper>
      </div>

      <div className="toolbar-separator"></div>

      {/* Grouping elemenets group */}
      <div className="toolbar-group">
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
            <ListOrdered />
          </button>
        </TooltipWrapper>
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
            <List />
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
            <TextQuote />
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
            <Icon iconNode={englishBlockIcon} />
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
            <Icon iconNode={frenchBlockIcon} />
          </button>
        </TooltipWrapper>
        <TooltipWrapper label={t.rtlBlock} shortcut={shortcuts.rtlBlock}>
          <button
            type="button"
            data-testid="rte-rtl_block"
            onClick={() =>
              announceToggle(
                () => editor.chain().focus().toggleRtlBlock().run(),
                () => editor.isActive("rtlBlock"),
                t.rtlBlock,
              )
            }
            className={
              "toolbar-button" +
              (editor.isActive("rtlBlock") ? " is-active" : "")
            }
            title={t.rtlBlock}
            aria-pressed={editor.isActive("rtlBlock")}
          >
            <span className="sr-only">
              {editor.isActive("rtlBlock") ? t.removePrefix : t.applyPrefix}
              {t.rtlBlock}
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
              className="icon icon-tabler icons-tabler-outline icon-tabler-text-direction-rtl"
              aria-hidden="true"
            >
              <path stroke="none" d="M0 0h24v24H0z" fill="none" />
              <path d="M16 4h-6.5a3.5 3.5 0 0 0 0 7h.5" />
              <path d="M14 15v-11" />
              <path d="M10 15v-11" />
              <path d="M5 19h14" />
              <path d="M7 21l-2 -2l2 -2" />
            </svg>
          </button>
        </TooltipWrapper>
        <TooltipWrapper
          label={
            useUnifiedConditionalButton ? t.conditional : t.conditionalBlock
          }
          shortcut={shortcuts.conditionalBlock}
        >
          <button
            type="button"
            data-testid={
              useUnifiedConditionalButton
                ? "rte-conditional"
                : "rte-conditional_block"
            }
            onMouseDown={(e) => {
              // Keep focus/selection in the editor when clicking the toolbar button,
              // otherwise the browser will focus the button and ProseMirror selection
              // may no longer reflect the currently focused conditional input.
              e.preventDefault();
            }}
            onClick={() => {
              if (!useUnifiedConditionalButton) {
                return announceToggle(
                  () => runBlockConditionalAction(),
                  () => editor.isActive("conditional"),
                  t.conditionalBlock,
                );
              }

              return announceToggle(
                () => runUnifiedConditionalAction(),
                () =>
                  editor.isActive("conditional") ||
                  editor.isActive("conditionalInline"),
                t.conditional,
              );
            }}
            className={
              "toolbar-button" +
              ((
                useUnifiedConditionalButton
                  ? editor.isActive("conditional") ||
                    editor.isActive("conditionalInline")
                  : editor.isActive("conditional")
              )
                ? " is-active"
                : "")
            }
            title={
              useUnifiedConditionalButton ? t.conditional : t.conditionalBlock
            }
            aria-pressed={
              useUnifiedConditionalButton
                ? editor.isActive("conditional") ||
                  editor.isActive("conditionalInline")
                : editor.isActive("conditional")
            }
          >
            <span className="sr-only">
              {useUnifiedConditionalButton
                ? (editor.isActive("conditional") ||
                  editor.isActive("conditionalInline")
                    ? t.removePrefix
                    : t.applyPrefix) + t.conditional
                : (editor.isActive("conditional")
                    ? t.removePrefix
                    : t.applyPrefix) + t.conditionalBlock}
            </span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 20 20"
            >
              <ellipse
                cx="3.33333"
                cy="7.91659"
                rx="3.33333"
                ry="4.58333"
                fill="#FFDA3D"
              />
              <path
                d="M15.0001 14.9999C15.4604 14.9999 15.8335 15.373 15.8335 15.8333C15.8335 16.2935 15.4604 16.6666 15.0001 16.6666H3.33347C2.87323 16.6666 2.50013 16.2935 2.50013 15.8333C2.50013 15.373 2.87323 14.9999 3.33347 14.9999H15.0001ZM2.50013 11.6764V11.6682C2.50015 11.208 2.87324 10.8349 3.33347 10.8349C3.7937 10.8349 4.16679 11.208 4.1668 11.6682V11.6764C4.1668 12.1366 3.79371 12.5097 3.33347 12.5097C2.87323 12.5097 2.50013 12.1366 2.50013 11.6764ZM18.3335 9.16659C18.7937 9.16659 19.1668 9.53968 19.1668 9.99992C19.1668 10.4602 18.7937 10.8333 18.3335 10.8333H8.33347C7.87323 10.8333 7.50013 10.4602 7.50013 9.99992C7.50013 9.53968 7.87323 9.16659 8.33347 9.16659H18.3335ZM3.33103 3.33325C4.70323 3.33325 5.86724 4.3422 6.06133 5.7006C6.21822 6.79885 5.70157 7.88452 4.7503 8.45532L3.76234 9.04777C3.36773 9.28454 2.85577 9.15668 2.61895 8.76213C2.38218 8.36752 2.51004 7.85556 2.90459 7.61873L3.89255 7.02629C4.26882 6.80053 4.47293 6.37099 4.41094 5.9366C4.33418 5.39925 3.87384 4.99992 3.33103 4.99992H3.24558C2.70004 5.0001 2.22474 5.37152 2.09242 5.9008L2.05824 6.03507C1.94663 6.48151 1.49475 6.75286 1.04831 6.64136C0.60188 6.52975 0.330531 6.07786 0.442029 5.63143L0.475395 5.49634C0.793256 4.2252 1.93532 3.33343 3.24558 3.33325H3.33103ZM18.3335 3.33325C18.7937 3.33325 19.1668 3.70635 19.1668 4.16659C19.1668 4.62682 18.7937 4.99992 18.3335 4.99992H8.33347C7.87323 4.99992 7.50013 4.62682 7.50013 4.16659C7.50013 3.70635 7.87323 3.33325 8.33347 3.33325H18.3335Z"
                fill="currentColor"
              />
            </svg>
          </button>
        </TooltipWrapper>

        {!useUnifiedConditionalButton && (
          <TooltipWrapper
            label={t.conditionalInline}
            shortcut={shortcuts.conditionalInline}
          >
            <button
              type="button"
              data-testid="rte-conditional_inline"
              onMouseDown={(e) => {
                // Keep focus/selection in the editor for the toggle behavior.
                e.preventDefault();
              }}
              onClick={() =>
                announceToggle(
                  () => runInlineConditionalAction(),
                  () => editor.isActive("conditionalInline"),
                  t.conditionalInline,
                )
              }
              className={
                "toolbar-button" +
                (editor.isActive("conditionalInline") ? " is-active" : "")
              }
              title={t.conditionalInline}
              aria-pressed={editor.isActive("conditionalInline")}
            >
              <span className="sr-only">
                {editor.isActive("conditionalInline")
                  ? t.removePrefix
                  : t.applyPrefix}
                {t.conditionalInline}
              </span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 20 20"
              >
                <ellipse cx="10" cy="10" rx="6" ry="8" fill="#FFDA3D" />
                <path
                  d="M2.63916 9.99991C2.63916 7.33739 3.52846 5.33066 4.4222 3.98998C4.8682 3.32098 5.31579 2.81726 5.65511 2.47794C5.82494 2.3081 5.96829 2.17846 6.07178 2.08975C6.1234 2.04551 6.16524 2.01141 6.19548 1.98721C6.2105 1.9752 6.22296 1.96581 6.2321 1.95873C6.23661 1.95524 6.2405 1.95206 6.24349 1.94978C6.24499 1.94863 6.24756 1.94652 6.24756 1.94652L6.24919 1.94571L6.25 1.9449L6.30941 1.90502C6.61066 1.72361 7.00602 1.79598 7.22168 2.08324C7.45164 2.38986 7.38981 2.82484 7.08333 3.05492L7.08171 3.05574C7.07826 3.0584 7.07218 3.06385 7.06299 3.0712C7.04444 3.08603 7.01448 3.11069 6.9751 3.14444C6.8963 3.21199 6.7791 3.31684 6.63656 3.45938C6.35091 3.74503 5.96509 4.17893 5.5778 4.75984C4.80492 5.91916 4.02751 7.66256 4.02751 9.99991C4.02751 12.3373 4.80492 14.0807 5.5778 15.24C5.96509 15.8209 6.35091 16.2548 6.63656 16.5404C6.7791 16.683 6.8963 16.7878 6.9751 16.8554C7.01448 16.8891 7.04444 16.9138 7.06299 16.9286C7.07218 16.936 7.07826 16.9414 7.08171 16.9441L7.08333 16.9449L7.13786 16.9897C7.3967 17.2281 7.43737 17.629 7.22168 17.9166C7.00602 18.2038 6.61066 18.2762 6.30941 18.0948L6.25 18.0549L6.24919 18.0541L6.24756 18.0533C6.24756 18.0533 6.24499 18.0512 6.24349 18.05C6.2405 18.0478 6.23661 18.0446 6.2321 18.0411C6.22296 18.034 6.2105 18.0246 6.19548 18.0126C6.16524 17.9884 6.1234 17.9543 6.07178 17.9101C5.96829 17.8214 5.82494 17.6917 5.65511 17.5219C5.31579 17.1826 4.8682 16.6788 4.4222 16.0098C3.52846 14.6692 2.63916 12.6624 2.63916 9.99991ZM15.9725 9.99991C15.9725 7.66256 15.1951 5.91916 14.4222 4.75984C14.0349 4.17893 13.6491 3.74503 13.3634 3.45938C13.2209 3.31684 13.1037 3.21199 13.0249 3.14444C12.9855 3.11069 12.9556 3.08603 12.937 3.0712C12.9278 3.06385 12.9217 3.0584 12.9183 3.05574L12.9167 3.05492C12.6102 2.82484 12.5484 2.38986 12.7783 2.08324C12.994 1.79598 13.3893 1.72361 13.6906 1.90502L13.75 1.9449L13.7508 1.94571L13.7524 1.94652C13.7524 1.94652 13.755 1.94863 13.7565 1.94978C13.7595 1.95206 13.7634 1.95524 13.7679 1.95873C13.777 1.96581 13.7895 1.9752 13.8045 1.98721C13.8348 2.01141 13.8766 2.04551 13.9282 2.08975C14.0317 2.17846 14.1751 2.3081 14.3449 2.47794C14.6842 2.81726 15.1318 3.32098 15.5778 3.98998C16.4715 5.33066 17.3608 7.33739 17.3608 9.99991C17.3608 12.6624 16.4715 14.6692 15.5778 16.0098C15.1318 16.6788 14.6842 17.1826 14.3449 17.5219C14.1751 17.6917 14.0317 17.8214 13.9282 17.9101C13.8766 17.9543 13.8348 17.9884 13.8045 18.0126C13.7895 18.0246 13.777 18.034 13.7679 18.0411C13.7634 18.0446 13.7595 18.0478 13.7565 18.05C13.755 18.0512 13.7524 18.0533 13.7524 18.0533L13.7508 18.0541L13.75 18.0549C13.4434 18.2849 13.0084 18.2231 12.7783 17.9166C12.5626 17.629 12.6033 17.2281 12.8621 16.9897L12.9167 16.9449L12.9183 16.9441C12.9217 16.9414 12.9278 16.936 12.937 16.9286C12.9556 16.9138 12.9855 16.8891 13.0249 16.8554C13.1037 16.7878 13.2209 16.683 13.3634 16.5404C13.6491 16.2548 14.0349 15.8209 14.4222 15.24C15.1951 14.0807 15.9725 12.3373 15.9725 9.99991Z"
                  fill="currentColor"
                />
                <path
                  d="M10.0083 13.3336C10.4685 13.3336 10.8416 13.7067 10.8416 14.167C10.8414 14.627 10.4684 15.0003 10.0083 15.0003H10.0001C9.54 15.0003 9.16698 14.627 9.16679 14.167C9.16679 13.7067 9.53989 13.3336 10.0001 13.3336H10.0083ZM8.24476 5.45602C8.9233 5.05729 9.72084 4.91125 10.4965 5.04424C11.2723 5.1773 11.9761 5.58067 12.483 6.18275C12.9898 6.78474 13.2677 7.54675 13.2667 8.33362L13.2561 8.56719C13.1499 9.71269 12.2788 10.4799 11.6456 10.902C11.2828 11.1439 10.9256 11.3214 10.6626 11.4383C10.5299 11.4973 10.4176 11.5419 10.337 11.5726C10.2968 11.5879 10.264 11.5999 10.2402 11.6084C10.2284 11.6126 10.219 11.6164 10.2117 11.6189C10.2082 11.6202 10.2052 11.6214 10.2028 11.6222C10.2017 11.6226 10.2004 11.6227 10.1995 11.623L10.1979 11.6238H10.1971C9.76045 11.7694 9.28792 11.5331 9.14238 11.0965C8.99729 10.6605 9.23258 10.1887 9.66809 10.0426V10.0434L9.66972 10.0426C9.67193 10.0418 9.67608 10.0406 9.68193 10.0385C9.69469 10.034 9.71593 10.0264 9.74378 10.0158C9.79996 9.99435 9.88385 9.96082 9.98548 9.91566C10.1911 9.82425 10.4592 9.68988 10.7212 9.51526C11.2957 9.13226 11.5999 8.72447 11.6001 8.33362V8.332C11.6006 7.93845 11.462 7.55724 11.2086 7.25615C10.9551 6.95504 10.6029 6.75303 10.215 6.68649C9.8271 6.62 9.42795 6.69298 9.08867 6.89238C8.74943 7.09176 8.49177 7.40501 8.36113 7.77617C8.2084 8.21033 7.73246 8.43915 7.2983 8.28642C6.86422 8.13371 6.63626 7.6577 6.78886 7.2236C7.05009 6.48101 7.56609 5.85488 8.24476 5.45602Z"
                  fill="currentColor"
                />
              </svg>
            </button>
          </TooltipWrapper>
        )}
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
              <Eye />
            ) : (
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M3 3H21C21.5523 3 22 3.44772 22 4V20C22 20.5523 21.5523 21 21 21H3C2.44772 21 2 20.5523 2 20V4C2 3.44772 2.44772 3 3 3ZM7 15.5V11.5L9 13.5L11 11.5V15.5H13V8.5H11L9 10.5L7 8.5H5V15.5H7ZM18 12.5V8.5H16V12.5H14L17 15.5L20 12.5H18Z"
                  fill="currentColor"
                />
              </svg>
            )}
          </button>
        </TooltipWrapper>
      </div>
    </AccessibleToolbar>
  );
};

export default MenuBar;
