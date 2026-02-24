import React, { useState, useCallback, useRef, useEffect } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import MenuBar from "./MenuBar";

import Document from "@tiptap/extension-document";
import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";
import Heading from "@tiptap/extension-heading";
import Blockquote from "@tiptap/extension-blockquote";
import BulletList from "@tiptap/extension-bullet-list";
import OrderedList from "@tiptap/extension-ordered-list";
import ListItem from "@tiptap/extension-list-item";
import Bold from "@tiptap/extension-bold";
import Italic from "@tiptap/extension-italic";
import HorizontalRule from "@tiptap/extension-horizontal-rule";
import HardBreak from "@tiptap/extension-hard-break";
import History from "@tiptap/extension-history";

import { EnglishBlock, FrenchBlock } from "./CustomComponents/LanguageNode";
import ConditionalNode from "./CustomComponents/ConditionalNode";
import ConditionalInlineMark from "./CustomComponents/ConditionalInlineNode";
import { RTLBlock } from "./CustomComponents/RTLNode";
import VariableMark from "./CustomComponents/VariableMark";
import MarkdownLink from "./CustomComponents/MarkdownLink";
import BlockquoteMarkdown from "./CustomComponents/BlockquoteMarkdown";
import { scanConditionalBodyForClose } from "./CustomComponents/Conditional/MarkdownIt";
import convertVariablesToSpans from "./utils/convertVariablesToSpans";
import { Markdown } from "tiptap-markdown";
import "./editor.compiled.css";
import LinkModal from "./LinkModal";
import MenubarShortcut from "./MenubarShortcut";

const SimpleEditor = ({
  inputId,
  labelId,
  initialContent,
  lang = "en",
  modeInputId,
  initialMode,
  preferenceUpdateUrl,
  csrfToken,
}) => {
  const [isLinkModalVisible, setLinkModalVisible] = useState(false);
  const [modalPosition, setModalPosition] = useState({ top: 0, left: 0 });
  const [selectionHighlight, setSelectionHighlight] = useState(null);
  const [isMarkdownView, setIsMarkdownView] = useState(
    initialMode === "markdown",
  );
  const [markdownValue, setMarkdownValue] = useState(initialContent || "");
  const [justOpenedLink, setJustOpenedLink] = useState(false);
  const currentLinkRef = useRef(null); // Track current link href to avoid repeated opens
  const lastUserEventRef = useRef({ type: null, key: null, time: 0 });
  const hasTrackedEditRef = useRef({ rte: false, markdown: false }); // GA: fire editor_content_changed once per mode per page load
  const viewToggleLabels = {
    en: { markdown: "Edit markdown", rte: "Return to rich text" },
    fr: { markdown: "Modifier le Markdown", rte: "Revenir à l'éditeur riche" },
  };
  const viewLabel = viewToggleLabels[lang] || viewToggleLabels.en;
  const toggleLabel = isMarkdownView ? viewLabel.rte : viewLabel.markdown;

  const conditionalLabels = {
    en: {
      prefix: "IF ",
      suffix: " is YES",
      defaultCondition: "variable",
      conditionAriaLabel: "Condition",
    },
    fr: {
      prefix: "SI ",
      suffix: " est OUI",
      defaultCondition: "variable",
      conditionAriaLabel: "Condition",
    },
  };
  const conditionalText = conditionalLabels[lang] || conditionalLabels.en;

  const updateHiddenInputValue = useCallback(
    (value = "") => {
      if (!inputId) return;
      const hiddenInput = document.getElementById(inputId);
      if (!hiddenInput) return;

      hiddenInput.value = value;
      const event = new Event("change", { bubbles: true });
      hiddenInput.dispatchEvent(event);
    },
    [inputId],
  );

  useEffect(() => {
    if (modeInputId) {
      const input = document.getElementById(modeInputId);
      if (input) {
        input.value = isMarkdownView ? "markdown" : "rte";
      }
    }
  }, [isMarkdownView, modeInputId]);

  // Helper function to get selection bounds for highlighting relative to modal position
  const getSelectionBounds = () => {
    try {
      const selection = window.getSelection();
      if (!selection.rangeCount) return null;

      const range = selection.getRangeAt(0);

      // For empty/collapsed selections, create a small highlight at cursor position
      if (range.collapsed) {
        const rect = range.getBoundingClientRect();
        return {
          top: rect.top,
          left: Math.max(0, rect.left - 2), // Small margin for visibility
          width: 4, // Small width for cursor highlight
          height: rect.height || 20, // Fallback height
        };
      }

      // For text selections, get the full bounding rectangle
      const rect = range.getBoundingClientRect();
      return {
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      };
    } catch (err) {
      console.warn("Error getting selection bounds:", err);
      return null;
    }
  };

  const editor = useEditor({
    shouldRerenderOnTransaction: true,
    extensions: [
      // Core extensions - required for basic functionality
      Document,
      Paragraph,
      Text,
      HardBreak,
      History,

      // Node extensions that match toolbar features
      Heading.configure({
        levels: [1, 2], // Only allow H2 and H3 as shown in toolbar
      }),
      Blockquote.configure({
        content: "block+", // Allow any block content inside blockquotes (paragraphs, lists, etc.)
      }),
      BulletList,
      OrderedList,
      ListItem,
      HorizontalRule,
      ConditionalNode.configure({
        prefix: conditionalText.prefix,
        suffix: conditionalText.suffix,
        defaultCondition: conditionalText.defaultCondition,
        conditionAriaLabel: conditionalText.conditionAriaLabel,
      }),
      // Mark extensions that match toolbar features
      Bold,
      Italic,
      ConditionalInlineMark.configure({
        prefix: conditionalText.prefix,
        suffix: conditionalText.suffix,
        defaultCondition: conditionalText.defaultCondition,
        conditionAriaLabel: conditionalText.conditionAriaLabel,
      }),
      VariableMark,
      MarkdownLink.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "link",
        },
      }),
      // TextAlign.configure({
      //   types: ["heading", "paragraph"],
      // }),
      EnglishBlock,
      // Register our Alt+F10 shortcut extension so it only fires when the editor is focused
      FrenchBlock,
      RTLBlock,
      MenubarShortcut,

      // Add Markdown extension with paste handling enabled
      Markdown.configure({
        html: true, // Allow HTML in markdown
        tightLists: true, // Use tight list formatting
        tightListClass: "tight", // CSS class for tight lists
        bulletListMarker: "-", // Use - for bullet lists
        linkify: false, // Don't auto-linkify URLs
        breaks: true, // Convert single line breaks to HardBreak nodes (= <br> in email)
        transformPastedText: true, // Transform pasted text to markdown
        transformCopiedText: true, // Transform copied text to markdown
      }),
      // Custom blockquote markdown handling (accept '^' inbound)
      BlockquoteMarkdown,
    ],
    editorProps: {
      attributes: {
        class: "tiptap",
        lang: lang,
        role: "textbox",
        "aria-labelledby": labelId,
        "aria-multiline": "true",
      },
      handleClickOn(view, pos, node, nodePos, event) {
        if (node.type.name === "link") {
          const { left, bottom } = event.target.getBoundingClientRect();
          setModalPosition({ top: bottom + 8, left });
          setLinkModalVisible(true);
          // record current link so transaction listener won't re-open redundantly
          try {
            currentLinkRef.current = editor.getAttributes("link").href || null;
          } catch (e) {
            console.error(
              "[SimpleEditor] Error getting link attributes in handleClickOn:",
              e,
            );
          }
          return true;
        }
        return false;
      },
      handlePaste: (view, event, slice) => {
        const text = event.clipboardData?.getData("text/plain");

        if (text) {
          // Prevent default paste behavior
          event.preventDefault();

          // Normalize pasted blockquote markers: convert leading '>' to '^'
          // for storage/markdown consistency while allowing the RTE to
          // render normal blockquotes via inbound normalization on parse.
          const normalizedForStorage = text.replace(/^(\s*)>/gm, "$1^");

          // Use the same markdown conversion logic as the markdown switch handler
          // This ensures pasted markdown is processed consistently
          convertMarkdownToEditorContent(normalizedForStorage, true);

          return true;
        }

        // Return false to allow default paste behavior if no text
        return false;
      },
    },
  });

  const openLinkModal = () => {
    // Capture selection bounds for highlighting
    const bounds = getSelectionBounds();
    setSelectionHighlight(bounds);

    try {
      // Prefer TipTap's view coordsAtPos if available — it's reliable for
      // collapsed selections and complex node structures.
      const sel = editor?.state?.selection;
      if (editor?.view && sel) {
        const pos = sel.from;
        const coords = editor.view.coordsAtPos(pos);
        if (coords) {
          const left = coords.left || coords.x;
          const top = (coords.bottom || coords.y) + 8;
          setModalPosition({ top, left });
          setLinkModalVisible(true);
          return;
        }
      }

      const selection = window.getSelection();
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);

        // Use client rects (works for non-collapsed selections). Prefer the
        // first client rect for start of selection; fallback to bounding rect.
        const clientRects = range.getClientRects();
        let rect =
          clientRects && clientRects.length
            ? clientRects[0]
            : range.getBoundingClientRect();

        // If rect appears empty and selection is collapsed, try expanding
        // the range slightly to get a caret-like rect.
        if (rect?.width === 0 && rect?.height === 0 && selection.isCollapsed) {
          const tempRange = range.cloneRange();
          try {
            if (range.startOffset > 0) {
              tempRange.setStart(range.startContainer, range.startOffset - 1);
            }
            const tempRects = tempRange.getClientRects();
            rect = tempRects && tempRects.length ? tempRects[0] : rect;
          } catch (err) {
            console.error(
              "[SimpleEditor] Error computing temporary rect in openLinkModal:",
              err,
            );
          }
        }

        const left = rect.left || 0;
        const top = (rect.top || 0) + (rect.height || 0) + 6;
        setModalPosition({ top, left });
        setLinkModalVisible(true);
      }
    } catch (err) {
      console.error("openLinkModal: failed to compute selection rect", err);
      // If anything goes wrong computing the rect, fall back to opening
      // the modal roughly in the editor area (center top) so it remains usable.
      try {
        const edRect = editor?.view?.dom?.getBoundingClientRect?.();
        const left = (edRect?.left || 0) + 20;
        const top = (edRect?.top || 0) + 40;
        setModalPosition({ top, left });
        setLinkModalVisible(true);
      } catch (e) {
        console.error("openLinkModal: fallback failed", e);
        setModalPosition({ top: 80, left: 80 });
        setLinkModalVisible(true);
      }
    }
  };

  // Recompute and set modal position (viewport coords) based on current selection
  const computeModalPosition = () => {
    try {
      const selState = editor?.state?.selection;
      if (editor?.view && selState) {
        const pos = selState.from;
        const coords = editor.view.coordsAtPos(pos);
        if (coords) {
          const left = coords.left || coords.x;
          const top = (coords.bottom || coords.y) + 8;
          setModalPosition({ top, left });
          return;
        }
      }

      const selection = window.getSelection();
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const clientRects = range.getClientRects();
        let rect =
          clientRects && clientRects.length
            ? clientRects[0]
            : range.getBoundingClientRect();
        if (rect?.width === 0 && rect?.height === 0 && selection.isCollapsed) {
          const tempRange = range.cloneRange();
          try {
            if (range.startOffset > 0)
              tempRange.setStart(range.startContainer, range.startOffset - 1);
            const tempRects = tempRange.getClientRects();
            rect = tempRects && tempRects.length ? tempRects[0] : rect;
          } catch (err) {
            console.error(
              "computeModalPosition: tempRange.getClientRects failed",
              err,
            );
          }
        }

        const left = rect.left || 0;
        const top = (rect.top || 0) + (rect.height || 0) + 6;
        setModalPosition({ top, left });
      }
    } catch (err) {
      console.error(
        "[SimpleEditor] Error computing modal position in computeModalPosition:",
        err,
      );
    }
  };

  // While the link modal is visible, update its position on scroll/resize
  // and when selection/editor state changes so it stays attached to the text.
  React.useEffect(() => {
    if (!isLinkModalVisible) return;

    // Initial compute
    computeModalPosition();

    let rafId = null;
    const tick = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => computeModalPosition());
    };

    window.addEventListener("scroll", tick, { passive: true });
    window.addEventListener("resize", tick);
    document.addEventListener("selectionchange", tick);
    if (editor) editor.on("transaction", tick);

    return () => {
      window.removeEventListener("scroll", tick);
      window.removeEventListener("resize", tick);
      document.removeEventListener("selectionchange", tick);
      if (editor) editor.off("transaction", tick);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [isLinkModalVisible, editor]);

  // Set initial content as Markdown after editor is created
  React.useEffect(() => {
    if (!editor) return;
    // Convert inbound stored caret markers '^' back to '>' so the RTE
    // renders normal blockquotes. We then set the markdownValue to the
    // original stored content (so Markdown view shows '^').
    const inboundForEditor = (initialContent || "").replace(
      /^(\s*)\^/gm,
      "$1>",
    );
    editor.commands.setContent(inboundForEditor);
    setMarkdownValue(initialContent || "");
  }, [editor, initialContent]);

  // Intercept Mod-a (Cmd/Ctrl+A) at the DOM capture phase so we can
  // normalize the selection to block boundaries before TipTap/ProseMirror
  // applies its default select-all behavior. This ensures keyboard
  // select-all matches mouse select-all for block toggles.
  // Hopefully tiptap will fix this upstream one day! (https://github.com/ueberdosis/tiptap/issues/6260)
  React.useEffect(() => {
    if (!editor || !editor.view || !editor.view.dom) return;
    const dom = editor.view.dom;

    const onCaptureKeyDown = (e) => {
      const isMac = /(Mac|iPhone|iPod|iPad)/i.test(navigator.platform);
      const modKey = isMac ? e.metaKey : e.ctrlKey;
      if (!modKey) return;
      if (e.key === "a" || e.key === "A") {
        if (editor.view && editor.view.composing) return;
        try {
          e.preventDefault();

          // Record whether selection was collapsed before the selectAll
          const prevSel = editor.state.selection;
          const wasCollapsed = prevSel.empty;

          // Let TipTap perform its selectAll, so stored state and behaviours
          // tied to that command remain consistent.
          editor.commands.selectAll();

          // Only run our normalization for keyboard-initiated select-all
          // when the previous selection was collapsed (user hadn't already
          // selected content with mouse) or when the selection becomes the
          // whole document. This avoids clobbering explicit mouse selections.
          const newSel = editor.state.selection;
          const isWholeDoc =
            newSel.from === 0 && newSel.to === editor.state.doc.content.size;

          if (wasCollapsed || isWholeDoc) {
            // Quick nudge hack: shrink selection by one character each side
            // to emulate a user doing Shift+Left then Shift+Right which
            // normalizes some command behavior without heavy coord math.
            try {
              const docSize = editor.state.doc.content.size;
              if (docSize > 2) {
                // shrink to [1, docSize-1]
                editor.commands.setTextSelection({ from: 1, to: docSize - 1 });
                // restore to full doc selection
                editor.commands.setTextSelection({ from: 0, to: docSize });
              }
            } catch (err) {
              console.error("select-all nudge failed", err);
            }
          }
        } catch (err) {
          console.error("onCaptureKeyDown (Mod-a) failed", err);
          // Ignore and allow default behavior to proceed
        }
      }
    };

    dom.addEventListener("keydown", onCaptureKeyDown, true);
    return () => dom.removeEventListener("keydown", onCaptureKeyDown, true);
  }, [editor]);

  // Listen to keyboard arrow events and check for link transitions
  React.useEffect(() => {
    if (!editor) return;

    const handleTransaction = () => {
      // This fires after every editor transaction, including arrow key navigation
      const isOnLink = editor.isActive("link");
      const linkHref = editor.getAttributes("link").href || null;

      const now = Date.now();
      const lastEvent = lastUserEventRef.current;

      const recentArrowOrClick =
        lastEvent &&
        (lastEvent.type === "arrow" || lastEvent.type === "click") &&
        now - lastEvent.time < 800;

      // Only auto-open on transitions caused by recent arrow navigation or clicks
      if (
        isOnLink &&
        linkHref !== currentLinkRef.current &&
        recentArrowOrClick
      ) {
        openLinkModal();
        currentLinkRef.current = linkHref;

        setTimeout(() => {
          setJustOpenedLink(true);
          setTimeout(() => setJustOpenedLink(false), 2500);
        }, 600);
      } else if (!isOnLink && currentLinkRef.current) {
        // Left a link - close modal
        setLinkModalVisible(false);
        currentLinkRef.current = null;
        setJustOpenedLink(false);
      }
    };

    editor.on("transaction", handleTransaction);

    // listen to DOM keydown/clicks to record recent arrow or click events
    const dom = editor.view.dom;
    const onKeyDown = (e) => {
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) {
        lastUserEventRef.current = {
          type: "arrow",
          key: e.key,
          time: Date.now(),
        };
      }
    };
    const onClick = () => {
      lastUserEventRef.current = { type: "click", time: Date.now() };
    };

    dom.addEventListener("keydown", onKeyDown);
    dom.addEventListener("click", onClick);

    return () => {
      editor.off("transaction", handleTransaction);
      dom.removeEventListener("keydown", onKeyDown);
      dom.removeEventListener("click", onClick);
    };
  }, [editor]);

  // Update hidden input field when content changes
  React.useEffect(() => {
    if (!editor) return;

    const updateHiddenInput = () => {
      try {
        // Get markdown from TipTap and normalize any leading '>' to '^'
        // for storage so downstream processes see caret markers.
        let markdown = editor.storage.markdown?.getMarkdown() ?? "";
        // Filter out zero-width space separators used to prevent adjacent variables/conditionals from merging
        markdown = markdown.replace(/\u200B/g, "");
        // Unescape serializer-escaped variable markers in link destinations
        // e.g., ](\\(\\(var\\)\\)) -> ](((var)))
        markdown = markdown.replace(/\\\(\\\(([^)]+)\\\)\\\)/g, (m, v) => {
          return `((${v}))`;
        });
        // Convert autolinked mailto forms like <mailto:person@example.com>
        // into explicit markdown links [person@example.com](mailto:person@example.com)
        // This prevents downstream storage using angle-bracket autolinks.
        markdown = markdown.replace(/<mailto:([^>\s]+)>/g, (m, addr) => {
          try {
            // Use the email address as the link text
            return `[${addr}](mailto:${addr})`;
          } catch (e) {
            return m;
          }
        });

        // Convert autolinked URL forms like <https://example.com>
        // into explicit markdown links [https://example.com](https://example.com)
        // This prevents downstream storage using angle-bracket autolinks.
        markdown = markdown.replace(/<(https?:\/\/[^>\s]+)>/g, (m, url) => {
          try {
            // Use the URL as the link text
            return `[${url}](${url})`;
          } catch (e) {
            return m;
          }
        });

        // Clean up HardBreak backslash continuations
        markdown = cleanMarkdownSerialization(markdown);

        markdown = markdown.replace(/^(\s*)>/gm, "$1^");
        updateHiddenInputValue(markdown);
      } catch (error) {
        console.error("Error getting markdown:", error);
      }
    };

    // Track that the user edited content (fire once per mode per page load)
    const trackContentChange = () => {
      if (!hasTrackedEditRef.current.rte && typeof gtag === "function") {
        hasTrackedEditRef.current.rte = true;
        gtag("event", "editor_content_changed", {
          event_category: "Template Editor",
          event_label: "Content change in RTE mode",
          editor_mode: "rte",
        });
      }
    };

    editor.on("update", updateHiddenInput);
    editor.on("update", trackContentChange);
    updateHiddenInput();

    return () => {
      editor.off("update", updateHiddenInput);
      editor.off("update", trackContentChange);
    };
  }, [editor, updateHiddenInputValue]);

  React.useEffect(() => {
    if (isMarkdownView) {
      updateHiddenInputValue(markdownValue);
    }
  }, [isMarkdownView, markdownValue, updateHiddenInputValue]);

  // Clean up markdown serialization artifacts (backslash continuations from HardBreak nodes)
  const cleanMarkdownSerialization = (markdown) => {
    if (!markdown) return markdown;
    // Remove backslash line continuations that the Markdown extension adds
    // for HardBreak nodes (we want plain newlines in storage)
    return markdown.replace(/\\\n/g, "\n");
  };

  // Helper function to convert markdown text to editor content.
  // Used both when pasting markdown and when switching from markdown view.
  // If `insertMode` is true, insert at cursor; otherwise replace all content.
  const convertMarkdownToEditorContent = (markdownText, insertMode = false) => {
    // Handle empty content - need to clear in replace mode
    if (!markdownText) {
      if (!insertMode) {
        editor.commands.clearContent();
      }
      return;
    }

    // Convert caret markers '^' to '>' so the editor renders blockquotes
    const convertedForEditor = markdownText.replace(/^(\s*)\^/gm, "$1>");

    // Normalize multi-line conditional markers to ensure they start and end
    // on their own paragraph when converting from markdown to rich content.
    const normalizeMarkdownConditionals = (txt) => {
      if (!txt || typeof txt !== "string") return txt;
      const re = /\(\([^?\n)]+\?\?[\s\S]*?\)\)(?!\))/g;
      let out = "";
      let lastIndex = 0;
      let m;
      while ((m = re.exec(txt)) !== null) {
        const start = m.index;
        const end = re.lastIndex;
        const match = m[0];

        // If the conditional is purely inline (no newline), leave it alone
        if (match.indexOf("\n") === -1) {
          // copy through unchanged
          out += txt.slice(lastIndex, end);
          lastIndex = end;
          continue;
        }

        out += txt.slice(lastIndex, start);

        // Ensure a blank line before (only for block conditionals)
        if (out.length === 0) {
          // at start, nothing to do
        } else if (!/\n\s*\n$/.test(out)) {
          if (out.endsWith("\n")) out += "\n";
          else out += "\n\n";
        }

        out += match;

        // Ensure a blank line after (lookahead from original text)
        const after = txt.slice(end);
        const hasBlankAfter = after.length === 0 || /^\s*\n\s*\n/.test(after);
        if (!hasBlankAfter) out += "\n\n";

        lastIndex = end;
      }

      out += txt.slice(lastIndex);
      return out;
    };

    const normalizedForEditor =
      normalizeMarkdownConditionals(convertedForEditor);

    // Auto-fix common heading mistakes where users type `#text` or `##text`
    // without a space after the hash symbols (e.g., `#heading` → `# heading`)
    // Only matches when there's NO space already (so `# heading` is left alone)
    // This only happens during markdown-to-editor conversion, not during typing
    // TODO: When no more templates contain these typos, we can remove this code
    let fixedHeadingSpacing = normalizedForEditor;
    // Process ## first to avoid backtracking issues with single #
    fixedHeadingSpacing = fixedHeadingSpacing.replace(
      /^##(?! )(\S)/gm,
      "## $1",
    );
    // Then process single #, but exclude cases where it's followed by another #
    fixedHeadingSpacing = fixedHeadingSpacing.replace(
      /^#(?!#)(?! )(\S)/gm,
      "# $1",
    );

    // For content with conditionals, use insertContent directly with markdown
    // (don't convert to HTML spans - let the markdown parser handle everything)
    const hasConditionals = /\(\([^?\n)]+\?\?[\s\S]*?\)\)/.test(
      fixedHeadingSpacing,
    );

    if (insertMode) {
      // For pasting: insert at cursor position
      if (hasConditionals) {
        // Use markdown parser for complex content with conditionals
        editor.commands.insertContent(fixedHeadingSpacing);
      } else {
        // For simple content without conditionals, convert variables to spans
        const htmlContent = convertVariablesToSpans(fixedHeadingSpacing);
        editor.commands.insertContent(htmlContent);
      }
    } else {
      // For switching from markdown view: replace all content
      editor.commands.clearContent();
      if (hasConditionals) {
        // Use markdown parser
        editor.commands.insertContent(fixedHeadingSpacing);
      } else {
        // Convert to spans for efficiency
        const htmlContent = convertVariablesToSpans(fixedHeadingSpacing);
        editor.commands.insertContent(htmlContent);
      }
    }

    // Force editor to re-render by triggering a transaction
    // This ensures all marks and nodes (including conditionals) are properly applied
    editor.view.dispatch(editor.state.tr);

    editor.commands.focus();
  };

  const toggleViewMode = () => {
    if (!editor) return;

    // Track the mode switch in Google Analytics
    if (typeof gtag === "function") {
      gtag("event", "editor_mode_toggle", {
        event_category: "Template Editor",
        event_label: "Editor Mode Toggle",
        editor_mode: isMarkdownView ? "markdown_to_rte" : "rte_to_markdown",
      });
    }

    if (isMarkdownView) {
      // Switching back from markdown to rich text
      const processedMarkdown = markdownValue || "";
      convertMarkdownToEditorContent(processedMarkdown);
    } else {
      // Switching from rich text to markdown
      let markdown = editor.storage.markdown?.getMarkdown() ?? "";
      // Filter out zero-width space separators used to prevent adjacent variables/conditionals from merging
      markdown = markdown.replace(/\u200B/g, "");
      // Unescape serializer-escaped variable markers in link destinations
      markdown = markdown.replace(/\\\(\\\(([^)]+)\\\)\\\)/g, (m, v) => {
        return `((${v}))`;
      });
      // Convert autolinked mailto forms like <mailto:person@example.com>
      // into explicit markdown links [person@example.com](mailto:person@example.com)
      markdown = markdown.replace(/<mailto:([^>\s]+)>/g, (m, addr) => {
        try {
          return `[${addr}](mailto:${addr})`;
        } catch (e) {
          return m;
        }
      });
      // Convert autolinked URL forms like <https://example.com>
      // into explicit markdown links [https://example.com](https://example.com)
      markdown = markdown.replace(/<(https?:\/\/[^>\s]+)>/g, (m, url) => {
        try {
          return `[${url}](${url})`;
        } catch (e) {
          return m;
        }
      });
      // Clean up HardBreak backslash continuations
      markdown = cleanMarkdownSerialization(markdown);
      // Normalize outgoing markdown to use '^' instead of '>'
      markdown = markdown.replace(/^(\s*)>/gm, "$1^");
      setMarkdownValue(markdown);
    }

    const nextMode = !isMarkdownView;
    setIsMarkdownView(nextMode);

    if (preferenceUpdateUrl) {
      fetch(preferenceUpdateUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": csrfToken,
        },
        body: JSON.stringify({ mode: nextMode ? "markdown" : "rte" }),
      }).catch((err) => {
        console.error("Failed to update editor preference:", err);
      });
    }
  };

  const onMarkdownKeyDown = (event) => {
    if (event.altKey && event.key === "F10") {
      event.preventDefault();
      event.stopPropagation();

      const toolbar = editor?.rteToolbar;
      if (toolbar) {
        toolbar.dispatchEvent(
          new CustomEvent("rte-request-focus", { bubbles: true }),
        );
      }
    }
  };

  // Feature flag: show a single context-aware conditional button in the toolbar.
  // When false, show separate block/inline conditional buttons.
  const useUnifiedConditionalButton = false;
  return (
    <div className="editor-wrapper">
      <MenuBar
        editor={editor}
        openLinkModal={openLinkModal}
        lang={lang}
        onToggleMarkdownView={toggleViewMode}
        isMarkdownView={isMarkdownView}
        toggleLabel={toggleLabel}
        useUnifiedConditionalButton={useUnifiedConditionalButton}
      />
      <div className="editor-content">
        {isMarkdownView ? (
          <textarea
            value={markdownValue}
            onChange={(event) => {
              setMarkdownValue(event.target.value);
              if (
                !hasTrackedEditRef.current.markdown &&
                typeof gtag === "function"
              ) {
                hasTrackedEditRef.current.markdown = true;
                gtag("event", "editor_content_changed", {
                  event_category: "Template Editor",
                  event_label: "Content change in markdown mode",
                  editor_mode: "markdown",
                });
              }
            }}
            onKeyDown={onMarkdownKeyDown}
            className="markdown-view"
            aria-label={viewLabel.markdown}
            spellCheck="false"
            data-testid="template-content"
          ></textarea>
        ) : (
          <EditorContent editor={editor} data-testid="rte-editor" />
        )}
      </div>
      <LinkModal
        editor={editor}
        isVisible={isLinkModalVisible}
        position={modalPosition}
        outline={selectionHighlight}
        onClose={() => {
          setLinkModalVisible(false);
          setSelectionHighlight(null);
        }}
        lang={lang}
        justOpened={justOpenedLink}
        onSavedLink={(href) => {
          try {
            currentLinkRef.current = href || null;
          } catch (e) {
            console.error("[SimpleEditor] Error in onSavedLink callback:", e);
          }
        }}
      />
    </div>
  );
};

export default SimpleEditor;
