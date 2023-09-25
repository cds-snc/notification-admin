import React, { useState, useEffect } from "react";
import { Editor } from "./Editor";
import {
  $convertToMarkdownString,
  TRANSFORMERS,
} from "@lexical/markdown";

type Language = "en" | "fr";

export const RichTextEditor = ({
  path,
  content,
  ariaLabel,
  ariaDescribedBy,
}: {
  path: string;
  content: string;
  lang: Language;
  ariaLabel?: string;
  ariaDescribedBy?: string;
}) => {
  var textInput = React.createRef()
  const [value, setValue] = useState(content);
  const [text, setText] = useState('');

  useEffect(() => {
    setValue(content);
  }, [content]);

  const updateValue = () => {
    setText($convertToMarkdownString(TRANSFORMERS));
  };

  return (
    <div className="w-full bg-white">
      <Editor
        content={value}
        onChange={updateValue}
        ariaLabel={""}
        ariaDescribedBy={""}
      />
      <input id="lexical_editor" value={text} type="hidden" />
    </div>
  );
};
