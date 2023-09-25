import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { RichTextEditor } from "./RichTextEditor";
import "./styles.css";

const rootElement = document.getElementById("root");

createRoot(rootElement).render(
  <StrictMode>
    <RichTextEditor
      path="path.to.content"
      content=""
      ariaLabel="AriaLabel"
      lang="en"
    />
  </StrictMode>,
);
