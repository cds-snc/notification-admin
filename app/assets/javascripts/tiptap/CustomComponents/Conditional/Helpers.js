// Shared utilities/constants for conditional extensions.

// Helper to check if the current position is inside a block conditional.
export const isInsideBlockConditional = (state, pos = null) => {
  const $pos = pos !== null ? state.doc.resolve(pos) : state.selection.$from;
  for (let depth = $pos.depth; depth > 0; depth--) {
    if ($pos.node(depth).type.name === "conditional") {
      return true;
    }
  }
  return false;
};

export const setCaretToPos = (element, pos) => {
  try {
    const range = document.createRange();
    const sel = window.getSelection();
    element.focus();

    if (!element.childNodes.length) {
      range.setStart(element, 0);
    } else {
      const textNode = element.childNodes[0];
      const offset = Math.min(pos, textNode.textContent.length);
      range.setStart(textNode, offset);
    }

    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
  } catch {
    // ignore
  }
};

export const selectAllContents = (element) => {
  try {
    const range = document.createRange();
    range.selectNodeContents(element);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    element.focus();
  } catch {
    // ignore
  }
};

export const isSelectionAtEnd = (element) => {
  try {
    const sel = window.getSelection();
    if (!sel.rangeCount) return false;
    const range = sel.getRangeAt(0);
    return range.endOffset === (element.textContent || "").length;
  } catch {
    return false;
  }
};

export const isSelectionAtStart = (element) => {
  try {
    const sel = window.getSelection();
    if (!sel.rangeCount) return false;
    const range = sel.getRangeAt(0);
    return range.startOffset === 0;
  } catch {
    return false;
  }
};

export const forceDomSelectionToPos = (view, pos) => {
  try {
    const doc = view?.dom?.ownerDocument || document;
    const selection = doc.getSelection?.();
    if (!selection) return;

    const { node, offset } = view.domAtPos(pos);
    const range = doc.createRange();
    range.setStart(node, offset);
    range.collapse(true);

    selection.removeAllRanges();
    selection.addRange(range);
  } catch {
    // ignore
  }
};

export const focusConditionalInput = (nodeDom, kind = "block") => {
  if (!nodeDom) return;

  const selector =
    kind === "inline"
      ? ".conditional-inline-condition-input[data-editor-focusable]"
      : ".conditional-block-condition-input";

  const input = nodeDom.querySelector(selector);
  if (!input) return;

  input.focus();

  if (input.tagName === "INPUT") {
    try {
      const end = input.value?.length ?? 0;
      input.setSelectionRange?.(end, end);
    } catch {
      // ignore
    }
  } else {
    // Handle span (contenteditable)
    try {
      const end = input.textContent?.length ?? 0;
      setCaretToPos(input, end);
    } catch {
      // ignore
    }
  }
};
