import React from "react";
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

const MenuBar = ({ editor }) => {
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

  const exportToMarkdown = () => {
    try {
      // Use the tiptap-markdown extension's storage method
      const markdown = editor.storage.markdown.getMarkdown();

      console.log("Markdown output:");
      console.log(markdown);

      // Copy to clipboard
      navigator.clipboard.writeText(markdown).then(() => {
        alert("Markdown copied to clipboard!");
      });
    } catch (error) {
      console.error("Error converting to Markdown:", error);
      alert("Error converting to Markdown. Check console for details.");
    }
  };

  return (
    <div className="toolbar">
      <div className="toolbar-group">
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
        <button
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 3 }).run()
          }
          className={
            "toolbar-button" +
            (editor.isActive("heading", { level: 3 }) ? " is-active" : "")
          }
          title="Heading 3"
        >
          H3
        </button>
      </div>

      <div className="toolbar-separator"></div>

      <div className="toolbar-group">
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
          >
            <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z" />
            <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z" />
          </svg>
        </button>
      </div>

      <div className="toolbar-separator"></div>

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
          >
            <line x1="19" y1="4" x2="10" y2="4" />
            <line x1="14" y1="20" x2="5" y2="20" />
            <line x1="15" y1="4" x2="9" y2="20" />
          </svg>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleVariable().run()}
          disabled={!editor.can().chain().focus().toggleVariable().run()}
          className={
            "toolbar-button" + (editor.isActive("variable") ? " is-active" : "")
          }
          title="Variable"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M8 8l8 8" />
            <path d="m8 16 8-8" />
            <path d="m16 8-8 8" />
            <path d="M8 8h8v8" />
          </svg>
        </button>
      </div>

      <div className="toolbar-separator"></div>

      <div className="toolbar-group">
        <button
          onClick={setLink}
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
          >
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
        </button>
      </div>

      <div className="toolbar-separator"></div>

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
          >
            <line x1="21" y1="10" x2="7" y2="10" />
            <line x1="21" y1="6" x2="3" y2="6" />
            <line x1="21" y1="14" x2="3" y2="14" />
            <line x1="21" y1="18" x2="7" y2="18" />
          </svg>
        </button>
      </div>

      <div className="toolbar-separator"></div>

      <div className="toolbar-group">
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
          >
            <line x1="3" y1="12" x2="21" y2="12" />
          </svg>
        </button>
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

      <div className="toolbar-group">
        <button
          onClick={exportToMarkdown}
          className="toolbar-button"
          title="Export to Markdown"
        >
          MD
        </button>
      </div>
    </div>
  );
};

const SimpleEditor = () => {
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
        levels: [2, 3], // Only allow H2 and H3 as shown in toolbar
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
      },
      handlePaste: (view, event, slice) => {
        // Get the plain text from clipboard
        const text = event.clipboardData?.getData("text/plain");

        if (text) {
          // Check if text contains variable syntax ((variable))
          const hasVariables = /\(\([^)]+\)\)/.test(text);

          if (hasVariables) {
            // Prevent default paste behavior
            event.preventDefault();

            // Process variables in the text
            let processedText = text;

            // Replace ((variable)) with HTML spans
            processedText = processedText.replace(
              /\(\(([^)]+)\)\)/g,
              '<span data-type="variable">$1</span>',
            );

            // Insert the processed HTML
            if (editor) {
              editor.commands.insertContent(processedText);
              return true;
            }
          } else {
            // No variables, handle as regular markdown
            // Prevent default paste behavior
            event.preventDefault();

            // Use setContent which supports markdown format
            if (editor) {
              // Get current content and append the new content
              const currentContent = editor.storage.markdown.getMarkdown();
              const newContent = currentContent + "\n\n" + text;
              editor.commands.setContent(newContent);
              return true;
            }
          }
        }

        // Return false to allow default paste behavior if no text
        return false;
      },
    },
  });

  // Set initial content as Markdown after editor is created
  React.useEffect(() => {
    if (editor) {
      const initialMarkdown = `## Welcome to the Editor

This is a simple editor with the controls you need. Try formatting some text:

- Make text **bold** or *italic*
- Create bullet or numbered lists  
- Add headings and links

Start editing to see it in action!`;

      editor.commands.setContent(initialMarkdown);
    }
  }, [editor]);

  return (
    <div className="editor-wrapper">
      <MenuBar editor={editor} />
      <div className="editor-content">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
};

export default SimpleEditor;
