import React, { useState, useCallback } from "react";
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
import TextAlign from "@tiptap/extension-text-align";

import { EnglishBlock, FrenchBlock } from "./CustomComponents/LanguageNode";
import VariableMark from "./CustomComponents/VariableMark";
import MarkdownLink from "./CustomComponents/MarkdownLink";
import convertVariablesToSpans from "./utils/convertVariablesToSpans";
import { Markdown } from "tiptap-markdown";
import "./editor.compiled.css";
import LinkModal from "./LinkModal";
import MenubarShortcut from "./MenubarShortcut";

const SimpleEditor = ({ inputId, labelId, initialContent, lang = "en" }) => {
  const [isLinkModalVisible, setLinkModalVisible] = useState(false);
  const [modalPosition, setModalPosition] = useState({ top: 0, left: 0 });
  const [selectionHighlight, setSelectionHighlight] = useState(null);
  const [isMarkdownView, setIsMarkdownView] = useState(false);
  const [markdownValue, setMarkdownValue] = useState(initialContent || "");
  const viewToggleLabels = {
    en: { markdown: "Edit markdown", rte: "Return to rich text" },
    fr: { markdown: "Modifier le Markdown", rte: "Revenir à l'éditeur riche" },
  };
  const viewLabel = viewToggleLabels[lang] || viewToggleLabels.en;
  const toggleLabel = isMarkdownView ? viewLabel.rte : viewLabel.markdown;

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

      // Mark extensions that match toolbar features
      Bold,
      Italic,
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
      MenubarShortcut,
      FrenchBlock,

      // Add Markdown extension with paste handling enabled
      Markdown.configure({
        html: true, // Allow HTML in markdown
        tightLists: true, // Use tight list formatting
        tightListClass: "tight", // CSS class for tight lists
        bulletListMarker: "-", // Use - for bullet lists
        linkify: false, // Don't auto-linkify URLs
        breaks: false, // Don't convert line breaks to <br>
        transformPastedText: true, // Transform pasted text to markdown
        transformCopiedText: true, // Transform copied text to markdown
      }),
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
          return true;
        }
        return false;
      },
      handlePaste: (view, event, slice) => {
        const text = event.clipboardData?.getData("text/plain");

        if (text) {
          // Prevent default paste behavior
          event.preventDefault();

          // Check if the text contains variables
          const hasVariables = /\(\([^)]+\)\)/.test(text);

          if (hasVariables) {
            // Replace variables with HTML spans (centralized helper)
            const processedText = convertVariablesToSpans(text);

            // Insert the processed HTML at the current cursor position
            editor.commands.insertContent(processedText);
          } else {
            // Check if the text contains Markdown syntax
            const isMarkdown = /[*_`#>-]|\[.*\]\(.*\)/.test(text);

            if (isMarkdown) {
              // Use TipTap's Markdown extension to parse and insert content
              editor.commands.insertContent(text);
            } else {
              // Handle plain text by splitting into lines
              const lines = text.split("\n");

              // Create an array of paragraph nodes
              const nodes = lines.map((line) => {
                return {
                  type: "paragraph",
                  content: line.trim() ? [{ type: "text", text: line }] : [],
                };
              });

              // Insert the nodes into the editor
              editor.commands.insertContent({ type: "doc", content: nodes });
            }
          }

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
        console.log("openLinkModal: coordsAtPos", { pos, coords });
        if (coords) {
          const left = coords.left || coords.x;
          const top = (coords.bottom || coords.y) + 8;
          console.log("openLinkModal: using coordsAtPos ->", { left, top });
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
            // ignore
          }
        }

        const left = rect.left || 0;
        const top = (rect.top || 0) + (rect.height || 0) + 6;
        console.log("openLinkModal: using range rect ->", {
          rect: { left: rect.left, top: rect.top, height: rect.height },
          left,
          top,
        });
        setModalPosition({ top, left });
        setLinkModalVisible(true);
      }
    } catch (err) {
      // If anything goes wrong computing the rect, fall back to opening
      // the modal roughly in the editor area (center top) so it remains usable.
      try {
        const edRect = editor?.view?.dom?.getBoundingClientRect?.();
        const left = (edRect?.left || 0) + 20;
        const top = (edRect?.top || 0) + 40;
        console.log("openLinkModal: fallback editor rect ->", {
          edRect,
          left,
          top,
        });
        setModalPosition({ top, left });
        setLinkModalVisible(true);
      } catch (e) {
        console.log("openLinkModal: final fallback");
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
            // ignore
          }
        }

        const left = rect.left || 0;
        const top = (rect.top || 0) + (rect.height || 0) + 6;
        setModalPosition({ top, left });
      }
    } catch (err) {
      // ignore errors during recompute
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
    editor.commands.setContent(initialContent);
    setMarkdownValue(initialContent || "");
  }, [editor, initialContent]);

  // Update hidden input field when content changes
  React.useEffect(() => {
    if (!editor) return;
    const updateHiddenInput = () => {
      try {
        const markdown = editor.storage.markdown?.getMarkdown() ?? "";
        updateHiddenInputValue(markdown);
      } catch (error) {
        console.error("Error getting markdown:", error);
      }
    };

    editor.on("update", updateHiddenInput);
    updateHiddenInput();

    return () => editor.off("update", updateHiddenInput);
  }, [editor, updateHiddenInputValue]);

  React.useEffect(() => {
    if (isMarkdownView) {
      updateHiddenInputValue(markdownValue);
    }
  }, [isMarkdownView, markdownValue, updateHiddenInputValue]);

  const toggleViewMode = () => {
    if (!editor) return;

    if (isMarkdownView) {
      // Switching back from markdown to rich text
      const processedMarkdown = markdownValue || "";

      // Set the content from markdown, converting variables to HTML spans
      // so behavior matches paste. We centralize conversion in helper.
      const processedForInsert = convertVariablesToSpans(processedMarkdown);
      editor.commands.setContent(processedForInsert);

      // Force editor to re-render by triggering a transaction
      // This ensures all marks and nodes are properly applied
      editor.view.dispatch(editor.state.tr);

      editor.commands.focus();
    } else {
      // Switching from rich text to markdown
      const markdown = editor.storage.markdown?.getMarkdown() ?? "";
      setMarkdownValue(markdown);
    }

    setIsMarkdownView((prev) => !prev);
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

  return (
    <div className="editor-wrapper">
      <MenuBar
        editor={editor}
        openLinkModal={openLinkModal}
        lang={lang}
        onToggleMarkdownView={toggleViewMode}
        isMarkdownView={isMarkdownView}
        toggleLabel={toggleLabel}
      />
      <div className="editor-content">
        {isMarkdownView ? (
          <textarea
            value={markdownValue}
            onChange={(event) => setMarkdownValue(event.target.value)}
            onKeyDown={onMarkdownKeyDown}
            className="markdown-view"
            aria-label={viewLabel.markdown}
            spellCheck="false"
            data-testid="markdown-editor"
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
      />
    </div>
  );
};

export default SimpleEditor;
