// Shared utilities for conditional extensions.

// Helper to check if the current position is inside a block conditional
export const isInsideBlockConditional = (state, pos = null) => {
  const $pos = pos !== null ? state.doc.resolve(pos) : state.selection.$from;
  for (let depth = $pos.depth; depth > 0; depth--) {
    if ($pos.node(depth).type.name === "conditional") {
      return true;
    }
  }
  return false;
};

export const hasSpaceAt = (doc, pos) => {
  try {
    if (pos < 0 || pos >= doc.content.size) return false;
    const text = doc.textBetween(pos, pos + 1, "\n", "\ufffc");
    return text === " ";
  } catch (e) {
    return false;
  }
};

export const getMarkAtPos = (doc, pos, markType) => {
  try {
    if (pos < 0 || pos > doc.content.size) return null;
    const $pos = doc.resolve(pos);
    return $pos.marks().find((m) => m.type === markType) || null;
  } catch (e) {
    return null;
  }
};

export const findRangeInTextblock = (state, markType, condition, aroundPos) => {
  const $around = state.doc.resolve(aroundPos);
  const parentStart = $around.start();
  const parentEnd = $around.end();
  let from = null;
  let to = null;

  state.doc.nodesBetween(parentStart, parentEnd, (node, pos) => {
    if (!node.isText) return;
    const has = node.marks.some(
      (m) => m.type === markType && m.attrs?.condition === condition,
    );
    if (!has) return;
    if (from === null || pos < from) from = pos;
    const end = pos + node.nodeSize;
    if (to === null || end > to) to = end;
  });

  if (from === null || to === null) return null;

  const before = state.doc
    .textBetween(parentStart, from, "\n", "\ufffc")
    .trim();
  const after = state.doc.textBetween(to, parentEnd, "\n", "\ufffc").trim();

  return {
    from,
    to,
    parentStart,
    parentEnd,
    onlyThingOnLine: before.length === 0 && after.length === 0,
  };
};
