import { Fragment } from "@tiptap/pm/model";

// Convert an inline conditional mark (in the current paragraph) into a block conditional node.
export const convertToBlockConditional = (editor, { markType, condition, splitAtCursor = true }) => {
  const { state } = editor;
  const { $from } = state.selection;

  // Inline marks cannot span multiple block nodes. Restrict all range detection
  // to the current textblock (paragraph).
  const paragraphFrom = $from.before();
  const paragraphTo = $from.after();
  const parentStart = $from.start();
  const parentEnd = $from.end();

  const findMarkRangeInParent = () => {
    const ranges = [];
    let current = null;

    state.doc.nodesBetween(parentStart, parentEnd, (node, pos) => {
      if (!node.isText) return;

      const hasThisMark = node.marks.some(
        (m) => m.type === markType && m.attrs?.condition === condition,
      );

      if (!hasThisMark) {
        if (current) {
          ranges.push(current);
          current = null;
        }
        return;
      }

      const nodeFrom = pos;
      const nodeTo = pos + node.nodeSize;

      if (!current) {
        current = { from: nodeFrom, to: nodeTo };
        return;
      }

      if (nodeFrom <= current.to) {
        current.to = Math.max(current.to, nodeTo);
      } else {
        ranges.push(current);
        current = { from: nodeFrom, to: nodeTo };
      }
    });

    if (current) ranges.push(current);

    const cursor = $from.pos;
    return (
      ranges.find((r) => cursor >= r.from && cursor <= r.to) ||
      ranges.find((r) => cursor - 1 >= r.from && cursor - 1 <= r.to) ||
      null
    );
  };

  const markRange = findMarkRangeInParent();
  if (!markRange) return false;

  const markFrom = markRange.from;
  const markTo = markRange.to;

  const cursorPosInMark = Math.min(Math.max($from.pos, markFrom), markTo);

  // Text outside the mark, but within the same paragraph.
  const textBeforeMark = state.doc.textBetween(parentStart, markFrom, "\n");
  const textAfterMark = state.doc.textBetween(markTo, parentEnd, "\n");

  // Get text before and after cursor within the mark
  const textBeforeCursor = state.doc.textBetween(markFrom, cursorPosInMark, "\n");
  const textAfterCursor = state.doc.textBetween(cursorPosInMark, markTo, "\n");

  // Create a transaction to replace the inline mark with a block conditional
  const { tr } = state;

  // Create the block conditional node
  const schema = state.schema;
  const paragraphs = [];

  if (splitAtCursor) {
    // Split content at cursor into two paragraphs
    const paragraph1 = schema.nodes.paragraph.create(
      null,
      textBeforeCursor ? schema.text(textBeforeCursor) : undefined,
    );
    const paragraph2 = schema.nodes.paragraph.create(
      null,
      textAfterCursor ? schema.text(textAfterCursor) : undefined,
    );
    paragraphs.push(paragraph1, paragraph2);
  } else {
    // Keep all content in one paragraph
    const text = textBeforeCursor + textAfterCursor;
    const paragraph = schema.nodes.paragraph.create(
      null,
      text ? schema.text(text) : undefined,
    );
    paragraphs.push(paragraph);
  }

  const conditionalNode = schema.nodes.conditional.create({ condition }, paragraphs);

  // Replace the entire containing paragraph with:
  // [paragraph(beforeText)] + [conditional block] + [paragraph(afterText)]
  // This guarantees we only convert the mark instance in this paragraph,
  // and prevents pulling adjacent paragraphs into the block.
  const replacementNodes = [];

  if (textBeforeMark.length > 0) {
    replacementNodes.push(
      schema.nodes.paragraph.create(null, schema.text(textBeforeMark)),
    );
  }

  replacementNodes.push(conditionalNode);

  if (textAfterMark.length > 0) {
    replacementNodes.push(
      schema.nodes.paragraph.create(null, schema.text(textAfterMark)),
    );
  }

  tr.replaceWith(paragraphFrom, paragraphTo, Fragment.fromArray(replacementNodes));

  // Position cursor appropriately
  const conditionalStart =
    paragraphFrom + (textBeforeMark.length > 0 ? replacementNodes[0].nodeSize : 0);

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
