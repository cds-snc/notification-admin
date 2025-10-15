import React, { useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
// Import only the specific extensions we need instead of StarterKit
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
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";

import { EnglishBlock, FrenchBlock } from "./CustomComponents/LanguageNode";
import VariableMark from "./CustomComponents/VariableMark";
import { Markdown } from "tiptap-markdown";
import "./editor.css";
import LinkModal from "./LinkModal";

const MenuBar = ({ editor, openLinkModal }) => {
  if (!editor) {
    return null;
  }

  const setLink = () => {
    const previousUrl = editor.getAttributes("link").href;
    const url = window.prompt("URL", previousUrl);

    // cancelled
    if (url === null) {
      return;
    }

    // empty
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }

    // update link
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  return (
    <div className="toolbar">
      {/* Headings group */}
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
          H1
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

      {/* Text align group */}
      <div className="toolbar-group">
        <button
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
          className={
            "toolbar-button" +
            (editor.isActive({ textAlign: "left" }) ? " is-active" : "")
          }
          title="Align Left"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <line x1="17" y1="10" x2="3" y2="10" />
            <line x1="21" y1="6" x2="3" y2="6" />
            <line x1="21" y1="14" x2="3" y2="14" />
            <line x1="17" y1="18" x2="3" y2="18" />
          </svg>
        </button>
        <button
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
          className={
            "toolbar-button" +
            (editor.isActive({ textAlign: "center" }) ? " is-active" : "")
          }
          title="Align Center"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <line x1="18" y1="10" x2="6" y2="10" />
            <line x1="21" y1="6" x2="3" y2="6" />
            <line x1="21" y1="14" x2="3" y2="14" />
            <line x1="18" y1="18" x2="6" y2="18" />
          </svg>
        </button>
        <button
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
          className={
            "toolbar-button" +
            (editor.isActive({ textAlign: "right" }) ? " is-active" : "")
          }
          title="Align Right"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <line x1="21" y1="10" x2="7" y2="10" />
            <line x1="21" y1="6" x2="3" y2="6" />
            <line x1="21" y1="14" x2="3" y2="14" />
            <line x1="21" y1="18" x2="7" y2="18" />
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
          FR
        </button>
      </div>
      <div className="toolbar-separator"></div>
    </div>
  );
};

const SimpleEditor = ({ inputId, labelId, initialContent }) => {
  const [isLinkModalVisible, setLinkModalVisible] = useState(false);
  const [modalPosition, setModalPosition] = useState({ top: 0, left: 0 });

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
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "link",
        },
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      EnglishBlock,
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
    // Don't set content here when using Markdown extension
    // We'll set it after the editor is created
    editorProps: {
      attributes: {
        class: "tiptap",
        role: "textbox",
        "aria-labelledby": labelId,
        "aria-multiline": "true",
      },
      handleClickOn(view, pos, node, nodePos, event) {
        if (node.type.name === "link") {
          const { top, left } = event.target.getBoundingClientRect();
          setModalPosition({ top: top + window.scrollY + 20, left });
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
            // Replace variables with HTML spans
            const processedText = text.replace(
              /\(\(([^)]+)\)\)/g,
              '<span data-type="variable">$1</span>',
            );

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
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      setModalPosition({
        top: rect.top + window.scrollY + 20,
        left: rect.left,
      });
      setLinkModalVisible(true);
    }
  };

  // Set initial content as Markdown after editor is created
  React.useEffect(() => {
    if (editor) {
      editor.commands.setContent(initialContent);
    }
  }, [editor]);

  // Update hidden input field when content changes
  React.useEffect(() => {
    if (editor && inputId) {
      const updateHiddenInput = () => {
        const hiddenInput = document.getElementById(inputId);
        if (hiddenInput) {
          try {
            const markdown = editor.storage.markdown.getMarkdown();
            hiddenInput.value = markdown;

            // Trigger change event for form validation
            const event = new Event("change", { bubbles: true });
            hiddenInput.dispatchEvent(event);
          } catch (error) {
            console.error("Error getting markdown:", error);
          }
        }
      };

      // Listen for content changes
      editor.on("update", updateHiddenInput);

      // Initial update
      updateHiddenInput();

      // Cleanup
      return () => {
        editor.off("update", updateHiddenInput);
      };
    }
  }, [editor, inputId]);

  return (
    <div className="editor-wrapper">
      <MenuBar editor={editor} openLinkModal={openLinkModal} />
      <div className="editor-content">
        <EditorContent editor={editor} />
      </div>
      <LinkModal
        editor={editor}
        isVisible={isLinkModalVisible}
        position={modalPosition}
        onClose={() => setLinkModalVisible(false)}
      />
    </div>
  );
};

export default SimpleEditor;
