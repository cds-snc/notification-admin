import React, { useState, useCallback, useRef } from "react";
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
import { RTLBlock } from "./CustomComponents/RTLNode";
import VariableMark from "./CustomComponents/VariableMark";
import MarkdownLink from "./CustomComponents/MarkdownLink";
import BlockquoteMarkdown from "./CustomComponents/BlockquoteMarkdown";
import convertVariablesToSpans from "./utils/convertVariablesToSpans";
import { Markdown } from "tiptap-markdown";
import "./editor.css";
import LinkModal from "./LinkModal";
import MenubarShortcut from "./MenubarShortcut";

const SimpleEditor = ({ inputId, labelId, initialContent, lang = "en" }) => {
  const [isLinkModalVisible, setLinkModalVisible] = useState(false);
  const [modalPosition, setModalPosition] = useState({ top: 0, left: 0 });
  const [isMarkdownView, setIsMarkdownView] = useState(false);
  const [markdownValue, setMarkdownValue] = useState(initialContent || "");
  const [justOpenedLink, setJustOpenedLink] = useState(false);
  const currentLinkRef = useRef(null); // Track current link href to avoid repeated opens
  const lastUserEventRef = useRef({ type: null, key: null, time: 0 });
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
        breaks: false, // Don't convert line breaks to <br>
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

          // Check if the text contains variables
          const hasVariables = /\(\([^)]+\)\)/.test(normalizedForStorage);

          if (hasVariables) {
            // Replace variables with HTML spans (centralized helper)
            const processedText = convertVariablesToSpans(normalizedForStorage);

            // Insert the processed HTML at the current cursor position
            editor.commands.insertContent(processedText);
          } else {
            // Check if the text contains Markdown syntax
            const isMarkdown = /[*_`#>\-\^]|\[.*\]\(.*\)/.test(
              normalizedForStorage,
            );

            if (isMarkdown) {
              // Use TipTap's Markdown extension to parse and insert content
              // The BlockquoteMarkdown extension will transform '^' to '>' for parsing
              editor.commands.insertContent(normalizedForStorage);
            } else {
              // Handle plain text by splitting into lines
              const lines = normalizedForStorage.split("\n");

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

        markdown = markdown.replace(/^(\s*)>/gm, "$1^");
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
      // Convert caret markers '^' to '>' so the editor renders blockquotes
      const convertedForEditor = processedMarkdown.replace(/^(\s*)\^/gm, "$1>");
      const processedForInsert = convertVariablesToSpans(convertedForEditor);
      editor.commands.setContent(processedForInsert);

      // Force editor to re-render by triggering a transaction
      // This ensures all marks and nodes are properly applied
      editor.view.dispatch(editor.state.tr);

      editor.commands.focus();
    } else {
      // Switching from rich text to markdown
      let markdown = editor.storage.markdown?.getMarkdown() ?? "";
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
      // Normalize outgoing markdown to use '^' instead of '>'
      markdown = markdown.replace(/^(\s*)>/gm, "$1^");
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
    <div className="editor-wrapper" data-timestamp={__BUILD_TIMESTAMP__}>
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
        onClose={() => setLinkModalVisible(false)}
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
