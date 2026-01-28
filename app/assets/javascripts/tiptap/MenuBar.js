import React, { useRef, useEffect, useCallback, useState } from "react";
import {
  Icon,
  Heading1,
  Heading2,
  Minus,
  Bold,
  Italic,
  Link,
  List,
  ListOrdered,
  TextQuote,
  Eye,
} from "lucide-react";
import TooltipWrapper from "./TooltipWrapper";
import { NodeSelection } from "@tiptap/pm/state";
import {
  variableIcon,
  englishBlockIcon,
  frenchBlockIcon,
  infoIcon,
  conditionalBlockIcon,
  conditionalInlineIcon,
} from "./icons";

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
  const [isInfoOpen, setIsInfoOpen] = useState(false);
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
      heading1: "Heading",
      heading2: "Subheading",
      variable: "Variable",
      bold: "Bold",
      italic: "Italic",
      bulletList: "Bulleted List",
      numberedList: "Numbered List",
      link: "Link",
      horizontalRule: "Section break",
      horizontalRuleInsert: "Insert Section Break",
      blockquote: "Blockquote",
      englishBlock: "English content",
      frenchBlock: "French content",
      conditionalBlock: "Conditional section",
      conditionalInline: "Inline conditional",
      conditional: "Conditional",
      rtlBlock: "Right-to-left text",
      infoPane1: "Insert variables with",
      infoPane2: "and conditional content with",
      infoPane3: "Focus on a button for its function and shortcut.",
      infoPane4: "Multilevel lists may be easier with markdown.",
      or: "or"
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
      heading2: "Sous titre",
      variable: "Variable",
      bold: "Gras",
      italic: "Italique",
      bulletList: "Liste à puces",
      numberedList: "Liste numérotée",
      link: "Lien",
      horizontalRule: "Saut de section",
      horizontalRuleInsert: "Insérer un saut de section",
      blockquote: "Bloc en retrait",
      englishBlock: "Contenu en anglais",
      frenchBlock: "Contenu en français",
      conditionalBlock: "Section conditionnelle",
      conditionalInline: "Conditionnel en ligne",
      conditional: "Conditionnel",
      rtlBlock: "Afficher de droite à gauche",
      infoPane1: "[FR] Insert variables with",
      infoPane2: "[FR] and conditional content with",
      infoPane3: "[FR] Focus on a button for its function and shortcut.",
      infoPane4: "[FR] Multilevel lists may be easier with markdown.",
      or: "ou"
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
    <>
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
            {conditionalBlockIcon()}
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
              {conditionalInlineIcon()}
            </button>
          </TooltipWrapper>
        )}
      </div>
      <div className="toolbar-separator"></div>

      {/* Toolbar group with info and markdown toggle */}
      <div className={"toolbar-group toolbar-switch-group " + (isMarkdownView ? "markdown-mode" : "")}>
        {/* info button */}
        { !isMarkdownView && 
          <TooltipWrapper label="Info">
            <button
              type="button"
              data-testid="rte-info"
              className={"toolbar-button" + (isInfoOpen ? " is-active" : "")}
              title="Info"
              onClick={() => setIsInfoOpen(!isInfoOpen)}
              aria-pressed={isInfoOpen}
            >
              <span className="sr-only">Info</span>
              <Icon iconNode={infoIcon} />
            </button>
          </TooltipWrapper>
        }

        {/* Markdown toggle button */}
        <TooltipWrapper label={toggleButtonLabel}>
          <button
            type="button"
            data-testid="rte-toggle-markdown"
            onClick={toggleHandler}
            className={"toolbar-button" + (isMarkdownView ? " button-try-new" : "")}
            title={toggleButtonLabel}
            aria-pressed={isMarkdownView}
          >
            <span className="sr-only">{toggleButtonLabel}</span>
            {isMarkdownView ? (
              <>Try the new editor</>
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
    {isInfoOpen && (
      <div className="info-pane">
        <p>
          {t.infoPane1}
          {" "}<Icon iconNode={variableIcon} fill="none" stroke="currentColor" strokeWidth={2} style={{ display: "inline", width: "1.2em", height: "1.2em", verticalAlign: "middle", marginX: "0.25em" }} />{" "}
          {t.infoPane2}
          {" "}{conditionalInlineIcon({ "aria-label": "inline conditional icon" })}{" "}{t.or}{" "}{conditionalBlockIcon({ "aria-label": "block conditional icon" })}
        </p>
        <p>{t.infoPane3}</p>
        <p>{t.infoPane4}</p>
      </div>
    )}
    </>
  );
};

export default MenuBar;
