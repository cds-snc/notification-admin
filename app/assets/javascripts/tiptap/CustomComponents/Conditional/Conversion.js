import { Fragment } from "@tiptap/pm/model";

// Convert an inline conditional node (in the current paragraph) into a block conditional node.
export const convertToBlockConditional = (
  editor,
  { inlineNodeType, condition, splitAtCursor = true },
) => {
  const { state } = editor;
  const { $from } = state.selection;

  if (!inlineNodeType) return false;

  // Restrict conversion to the current textblock (paragraph).
  const paragraphFrom = $from.before();
  const paragraphTo = $from.after();
  const parentStart = $from.start();
  const parentEnd = $from.end();

  const findInlineNodeInParent = () => {
    // Prefer the nearest ancestor inline conditional node.
    for (let depth = $from.depth; depth > 0; depth--) {
      const n = $from.node(depth);
      if (n.type !== inlineNodeType) continue;
      const pos = $from.before(depth);
      return { node: n, pos };
    }

    // Fallback: if cursor is directly before/after the node.
    const nodeAfter = $from.nodeAfter;
    if (nodeAfter?.type === inlineNodeType) {
      return { node: nodeAfter, pos: $from.pos };
    }

    const nodeBefore = $from.nodeBefore;
    if (nodeBefore?.type === inlineNodeType) {
      return { node: nodeBefore, pos: $from.pos - nodeBefore.nodeSize };
    }

    return null;
  };

  const inlineNodeFound = findInlineNodeInParent();
  if (!inlineNodeFound) return false;

  const inlineNodePos = inlineNodeFound.pos;
  const inlineNode = inlineNodeFound.node;

  const cursorPosInInline = (() => {
    const start = inlineNodePos + 1;
    const end = inlineNodePos + inlineNode.nodeSize - 1;
    return Math.min(Math.max($from.pos, start), end);
  })();

  const nodeFrom = inlineNodePos;
  const nodeTo = inlineNodePos + inlineNode.nodeSize;

  const nodeContentFrom = nodeFrom + 1;
  const nodeContentTo = nodeTo - 1;

  const beforeFragment = state.doc.slice(parentStart, nodeFrom).content;
  const afterFragment = state.doc.slice(nodeTo, parentEnd).content;

  const beforeCursorFragment = state.doc.slice(
    nodeContentFrom,
    cursorPosInInline,
  ).content;
  const afterCursorFragment = state.doc.slice(
    cursorPosInInline,
    nodeContentTo,
  ).content;

  // Create a transaction to replace the inline mark with a block conditional
  const { tr } = state;

  // Create the block conditional node
  const schema = state.schema;
  const paragraphs = [];

  if (splitAtCursor) {
    // Split content at cursor into two paragraphs
    const paragraph1 = schema.nodes.paragraph.create(
      null,
      beforeCursorFragment.size ? beforeCursorFragment : undefined,
    );
    const paragraph2 = schema.nodes.paragraph.create(
      null,
      afterCursorFragment.size ? afterCursorFragment : undefined,
    );
    paragraphs.push(paragraph1, paragraph2);
  } else {
    // Keep all content in one paragraph
    const text = null;
    void text;

    const combined = Fragment.fromArray([
      ...beforeCursorFragment.toArray(),
      ...afterCursorFragment.toArray(),
    ]);
    const paragraph = schema.nodes.paragraph.create(
      null,
      combined.size ? combined : undefined,
    );
    paragraphs.push(paragraph);
  }

  const conditionalNode = schema.nodes.conditional.create(
    { condition },
    paragraphs,
  );

  // Replace the entire containing paragraph with:
  // [paragraph(beforeText)] + [conditional block] + [paragraph(afterText)]
  // This guarantees we only convert the mark instance in this paragraph,
  // and prevents pulling adjacent paragraphs into the block.
  const replacementNodes = [];

  const beforeParagraph = beforeFragment.size
    ? schema.nodes.paragraph.create(null, beforeFragment)
    : null;

  if (beforeParagraph) replacementNodes.push(beforeParagraph);

  replacementNodes.push(conditionalNode);

  const afterParagraph = afterFragment.size
    ? schema.nodes.paragraph.create(null, afterFragment)
    : null;

  if (afterParagraph) replacementNodes.push(afterParagraph);

  tr.replaceWith(
    paragraphFrom,
    paragraphTo,
    Fragment.fromArray(replacementNodes),
  );

  // Position cursor appropriately
  const conditionalStart =
    paragraphFrom + (beforeParagraph ? beforeParagraph.nodeSize : 0);

  let cursorPos;
  if (splitAtCursor) {
    // Position at start of second paragraph inside the conditional.
    // +1 enters the conditional node, +paragraph.nodeSize skips first paragraph,
    // +1 enters the second paragraph's content.
    cursorPos = conditionalStart + 1 + paragraphs[0].nodeSize + 1;
  } else {
    // Position at end of content
    cursorPos = conditionalStart + conditionalNode.nodeSize - 2;
  }

  tr.setSelection(state.selection.constructor.near(tr.doc.resolve(cursorPos)));

  editor.view.dispatch(tr);
  return true;
};
