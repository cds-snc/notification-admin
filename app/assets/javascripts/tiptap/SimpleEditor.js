// Reconstructed SimpleEditor.js (core only) — minimal for editor core PR
import React from "react";
import { EditorContent, useEditor } from "@tiptap/react";

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

const SimpleEditor = ({ inputId, labelId, initialContent }) => {
  const editor = useEditor({
    shouldRerenderOnTransaction: true,
    extensions: [
      Document,
      Paragraph,
      Text,
      HardBreak,
      History,
      Heading.configure({ levels: [1, 2] }),
      Blockquote.configure({ content: "block+" }),
      BulletList,
      OrderedList,
      ListItem,
      HorizontalRule,
      Bold,
      Italic,
      Link.configure({ openOnClick: false, HTMLAttributes: { class: "link" } }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
    ],
    editorProps: {
      attributes: {
        class: "tiptap",
        role: "textbox",
        "aria-labelledby": labelId,
        "aria-multiline": "true",
      },
      handleClickOn() {
        return false;
      },
      handlePaste: (view, event) => {
        const text = event.clipboardData?.getData("text/plain");
        if (!text) return false;
        event.preventDefault();
        // Minimal paste handling: insert plain text paragraphs
        const lines = text.split("\n");
        const nodes = lines.map((line) => ({
          type: "paragraph",
          content: line.trim() ? [{ type: "text", text: line }] : [],
        }));
        editor.commands.insertContent({ type: "doc", content: nodes });
        return true;
      },
    },
  });

  React.useEffect(() => {
    if (editor) editor.commands.setContent(initialContent || "");
  }, [editor]);

  React.useEffect(() => {
    if (editor && inputId) {
      const updateHiddenInput = () => {
        const hiddenInput = document.getElementById(inputId);
        if (hiddenInput) {
          try {
            hiddenInput.value = editor.getHTML();
            hiddenInput.dispatchEvent(new Event("change", { bubbles: true }));
          } catch (err) {
            console.error(err);
          }
        }
      };
      editor.on("update", updateHiddenInput);
      updateHiddenInput();
      return () => editor.off("update", updateHiddenInput);
    }
  }, [editor, inputId]);

  return (
    <div className="editor-wrapper">
      <div className="editor-content">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
};

export default SimpleEditor;
