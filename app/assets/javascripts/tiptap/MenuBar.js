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
} from "lucide-react";
import TooltipWrapper from "./TooltipWrapper";
import { NodeSelection } from "@tiptap/pm/state";
import {
  variableIcon,
  englishBlockIcon,
  frenchBlockIcon,
  infoIcon,
  markdownIcon,
  conditionalBlockIcon,
  conditionalInlineIcon,
  rightToLeftIcon,
} from "./icons";
import { shortcuts } from "./localization";
import { useEditorContext } from "./EditorContext";

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
      aria-keyshortcuts={shortcuts.toolbarFocusAria}
      aria-orientation="horizontal"
      onKeyDown={handleKeyDown}
      data-testid="rte-toolbar"
    >
      {children}
    </div>
  );
};

const ToolbarButton = ({
  testId,
  onClick,
  onMouseDown,
  isActive = false,
  isDisabled = false,
  labels,
  children,
}) => {
  const { t } = useEditorContext();
  const label = labels.label || labels;
  const shortcut = labels.shortcut;

  // Choose verb prefix for the sr-only action text.
  // Most buttons use the shared `apply` verb; some can set `verb: "insert"`.
  const verbKey = labels.verb || "apply";
  const applyVerb = (t.verbs && t.verbs[verbKey]) || t.verbs.apply;
  const removeVerb = t.verbs.remove;

  const description = labels.label
    ? isActive
      ? `${removeVerb} ${labels.label}`
      : `${applyVerb} ${labels.label}`
    : labels;

  return (
    <TooltipWrapper label={label} shortcut={shortcut}>
      <button
        type="button"
        data-testid={testId}
        onClick={onClick}
        onMouseDown={onMouseDown}
        disabled={isDisabled}
        className={"toolbar-button" + (isActive ? " is-active" : "")}
        aria-pressed={isActive}
      >
        <span className="sr-only">{description}</span>
        {children}
      </button>
    </TooltipWrapper>
  );
};

const MenuBar = ({
  editor,
  openLinkModal,
  onToggleMarkdownView,
  isMarkdownView,
  toggleLabel,
  useUnifiedConditionalButton = false,
}) => {
  if (!editor) {
    return null;
  }

  const { t } = useEditorContext();
  const [liveMessage, setLiveMessage] = useState("");
  const [isInfoOpen, setIsInfoOpen] = useState(false);

  // Helper to run an editor action and announce the resulting state change.
  // We perform the action (which usually pulls focus to the editor) immediately,
  // then set the live message
  const announceToggle = (actionFn, checkFn, labels) => {
    try {
      // Perform the action immediately (this pulls focus to editor)
      actionFn();

      // Check the resulting state and determine the appropriate label to announce.
      const active = checkFn();
      const actionLabel = active
        ? labels.applied || t.applied
        : labels.removed || t.removed;

      setLiveMessage(`${labels.label} ${actionLabel}`);
    } catch (err) {
      // ignore
    }
  };

  // Close info pane when switching to markdown view
  useEffect(() => {
    if (isMarkdownView) {
      setIsInfoOpen(false);
    }
  }, [isMarkdownView]);

  // Once the liveMessage is set, clear it after 2 seconds. This ensures
  // the live region is ready for the next announcement and doesn't
  // repeat stale information on a future focus event.
  useEffect(() => {
    if (!liveMessage) return;

    const timeout = setTimeout(() => {
      setLiveMessage("");
    }, 2000);

    return () => clearTimeout(timeout);
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

    // Let the extension decide the default condition label (configured per language).
    return editor.chain().focus().setConditionalInline().run();
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

  const toggleButtonLabel = toggleLabel || t.toggleMd;

  return (
    <>
      <AccessibleToolbar
        label={t.toolbar}
        editor={editor}
        className={isMarkdownView ? "markdown-mode" : ""}
      >
        <div
          className="sr-only"
          role="status"
          aria-live="polite"
          aria-atomic="true"
          data-testid="rte-liveregion"
          id="toolbar-liveregion"
        >
          {liveMessage}
        </div>

        {/* First group: Headings */}
        <div className="toolbar-group">
          <ToolbarButton
            testId="rte-heading_1"
            onClick={() =>
              announceToggle(
                () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
                () => editor.isActive("heading", { level: 1 }),
                t.heading1,
              )
            }
            isActive={editor.isActive("heading", { level: 1 })}
            labels={t.heading1}
          >
            <Heading1 />
          </ToolbarButton>

          <ToolbarButton
            testId="rte-heading_2"
            onClick={() =>
              announceToggle(
                () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
                () => editor.isActive("heading", { level: 2 }),
                t.heading2,
              )
            }
            isActive={editor.isActive("heading", { level: 2 })}
            labels={t.heading2}
          >
            <Heading2 />
          </ToolbarButton>

          <ToolbarButton
            testId="rte-horizontal_rule"
            onClick={() =>
              announceToggle(
                () => editor.chain().focus().setHorizontalRule().run(),
                () => editor.isActive("horizontalRule"),
                t.horizontalRule,
              )
            }
            isActive={editor.isActive("horizontalRule")}
            labels={t.horizontalRule}
          >
            <Minus />
          </ToolbarButton>
        </div>

        {/* Second group: Bold, Italic, Link */}
        <div className="toolbar-group">
          <ToolbarButton
            testId="rte-bold"
            onClick={() =>
              announceToggle(
                () => editor.chain().focus().toggleBold().run(),
                () => editor.isActive("bold"),
                t.bold,
              )
            }
            isActive={editor.isActive("bold")}
            isDisabled={!editor.can().chain().focus().toggleBold().run()}
            labels={t.bold}
          >
            <Bold />
          </ToolbarButton>

          <ToolbarButton
            testId="rte-italic"
            onClick={() =>
              announceToggle(
                () => editor.chain().focus().toggleItalic().run(),
                () => editor.isActive("italic"),
                t.italic,
              )
            }
            isActive={editor.isActive("italic")}
            isDisabled={!editor.can().chain().focus().toggleItalic().run()}
            labels={t.italic}
          >
            <Italic />
          </ToolbarButton>

          <ToolbarButton
            testId="rte-link"
            onClick={() => {
              openLinkModal();
              setTimeout(() => setLiveMessage(t.linkDialogOpened), 0);
            }}
            isActive={editor.isActive("link")}
            labels={t.link}
          >
            <Link />
          </ToolbarButton>
        </div>

        {/* Third group: Bullet list, Numbered list, Blockquote */}
        <div className="toolbar-group">
          <ToolbarButton
            testId="rte-bullet_list"
            onClick={() =>
              announceToggle(
                () => editor.chain().focus().toggleBulletList().run(),
                () => editor.isActive("bulletList"),
                t.bulletList,
              )
            }
            isActive={editor.isActive("bulletList")}
            labels={t.bulletList}
          >
            <List />
          </ToolbarButton>

          <ToolbarButton
            testId="rte-numbered_list"
            onClick={() =>
              announceToggle(
                () => editor.chain().focus().toggleOrderedList().run(),
                () => editor.isActive("orderedList"),
                t.orderedList,
              )
            }
            isActive={editor.isActive("orderedList")}
            labels={t.orderedList}
          >
            <ListOrdered />
          </ToolbarButton>

          <ToolbarButton
            testId="rte-blockquote"
            onClick={() =>
              announceToggle(
                () => editor.chain().focus().toggleBlockquote().run(),
                () => editor.isActive("blockquote"),
                t.blockquote,
              )
            }
            isActive={editor.isActive("blockquote")}
            labels={t.blockquote}
          >
            <TextQuote />
          </ToolbarButton>
        </div>

        {/* Fourth group: Variable, Conditional block, Conditional inline */}
        <div className="toolbar-group">
          <ToolbarButton
            testId="rte-variable"
            onClick={() =>
              announceToggle(
                () => editor.chain().focus().toggleVariable().run(),
                () => editor.isActive("variable"),
                t.variable,
              )
            }
            isActive={editor.isActive("variable")}
            isDisabled={!editor.can().chain().focus().toggleVariable().run()}
            labels={t.variable}
          >
            <Icon iconNode={variableIcon} />
          </ToolbarButton>

          {!useUnifiedConditionalButton && (
            <ToolbarButton
              testId="rte-conditional_inline"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() =>
                announceToggle(
                  () => runInlineConditionalAction(),
                  () => editor.isActive("conditionalInline"),
                  t.conditionalInline,
                )
              }
              isActive={editor.isActive("conditionalInline")}
              labels={t.conditionalInline}
            >
              <Icon iconNode={conditionalInlineIcon} />
            </ToolbarButton>
          )}

          <ToolbarButton
            testId={
              useUnifiedConditionalButton
                ? "rte-conditional"
                : "rte-conditional_block"
            }
            onMouseDown={(e) => e.preventDefault()}
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
            isActive={
              useUnifiedConditionalButton
                ? editor.isActive("conditional") ||
                  editor.isActive("conditionalInline")
                : editor.isActive("conditional")
            }
            labels={
              useUnifiedConditionalButton ? t.conditional : t.conditionalBlock
            }
          >
            <Icon iconNode={conditionalBlockIcon} />
          </ToolbarButton>
        </div>

        {/* Fifth group: English, French, RTL */}
        <div className="toolbar-group">
          <ToolbarButton
            testId="rte-english_block"
            onClick={() =>
              announceToggle(
                () => editor.chain().focus().toggleEnglishBlock().run(),
                () => editor.isActive("englishBlock"),
                t.englishBlock,
              )
            }
            isActive={editor.isActive("englishBlock")}
            labels={t.englishBlock}
          >
            <Icon iconNode={englishBlockIcon} />
          </ToolbarButton>

          <ToolbarButton
            testId="rte-french_block"
            onClick={() =>
              announceToggle(
                () => editor.chain().focus().toggleFrenchBlock().run(),
                () => editor.isActive("frenchBlock"),
                t.frenchBlock,
              )
            }
            isActive={editor.isActive("frenchBlock")}
            labels={t.frenchBlock}
          >
            <Icon iconNode={frenchBlockIcon} />
          </ToolbarButton>

          <ToolbarButton
            testId="rte-rtl_block"
            onClick={() =>
              announceToggle(
                () => editor.chain().focus().toggleRtlBlock().run(),
                () => editor.isActive("rtlBlock"),
                t.rtlBlock,
              )
            }
            isActive={editor.isActive("rtlBlock")}
            labels={t.rtlBlock}
          >
            <Icon iconNode={rightToLeftIcon} />
          </ToolbarButton>
        </div>

        {/* Sixth group: Info button */}
        <div
          className="toolbar-group toolbar-switch-group"
          data-mode={isMarkdownView ? "markdown" : "richtext"}
        >
          {!isMarkdownView && (
            <ToolbarButton
              testId="rte-info"
              onClick={() => setIsInfoOpen(!isInfoOpen)}
              isActive={isInfoOpen}
              labels={t.info}
            >
              <Icon iconNode={infoIcon(isInfoOpen)} />
            </ToolbarButton>
          )}

          {isMarkdownView && (
            <p class="m-0 text-xs font-bold">
              <span>{t.markdownEditorMessage}</span>
            </p>
          )}
          {!isMarkdownView && (
            <TooltipWrapper label={t.markdownButton}>
              <button
                type="button"
                data-testid="rte-toggle-markdown"
                onClick={onToggleMarkdownView}
                className="toolbar-button toolbar-button-mode"
                aria-pressed={isMarkdownView}
              >
                <span className="sr-only">{toggleButtonLabel}</span>
                <Icon iconNode={markdownIcon} />
              </button>
            </TooltipWrapper>
          )}
          {isMarkdownView && (
            <button
              type="button"
              data-testid="rte-toggle-markdown"
              onClick={onToggleMarkdownView}
              className="toolbar-button toolbar-button-mode toolbar-switch-group"
              aria-pressed={isMarkdownView}
            >
              <span className="sr-only">{toggleButtonLabel}</span>
              <>{t.richTextButton}</>
            </button>
          )}
        </div>
      </AccessibleToolbar>
      {isInfoOpen && (
        <div className="info-pane">
          <p>
            {t.infoPane1} <br />
            {t.infoPane2}{" "}
            <Icon iconNode={variableIcon} aria-label="Variable icon" />{" "}
            <p>{t.infoPane3}</p>
            <ul className="list list-bullet ml-10">
              <li>
                {t.infoPane4}{" "}
                <Icon
                  iconNode={conditionalInlineIcon}
                  aria-label="inline conditional icon"
                />
              </li>
              <li>
                {t.infoPane5}{" "}
                <Icon
                  iconNode={conditionalBlockIcon}
                  aria-label="block conditional icon"
                />
              </li>
            </ul>
          </p>
        </div>
      )}
    </>
  );
};

export default MenuBar;
