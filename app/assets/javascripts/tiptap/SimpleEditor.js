import React, { useState } from "react";
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
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";

import { EnglishBlock, FrenchBlock } from "./CustomComponents/LanguageNode";
import VariableMark from "./CustomComponents/VariableMark";
import { Markdown } from "tiptap-markdown";
import "./editor.css";
import LinkModal from "./LinkModal";

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
