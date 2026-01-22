// Shared markdown-it parsing helpers for conditional inline + block nodes.

const OPEN = "((";
const CLOSE = "))";

const installConditionalRendererRules = (
  md,
  { openRule, closeRule, tag, dataType, className, defaultCondition },
) => {
  md.renderer.rules[openRule] = (tokens, idx) => {
    const token = tokens[idx];
    const condition = token.attrGet("data-condition") || defaultCondition;
    return `<${tag} data-type="${dataType}" data-condition="${condition}" class="${className}">`;
  };

  md.renderer.rules[closeRule] = () => `</${tag}>`;
};

export const scanConditionalBodyForClose = (
  chunk,
  { initialDepth = 0 } = {},
) => {
  let depth = initialDepth;
  let i = 0;
  const collected = [];

  while (i < chunk.length) {
    const nextOpen = chunk.indexOf(OPEN, i);
    const nextClose = chunk.indexOf(CLOSE, i);

    const openIdx = nextOpen === -1 ? Number.POSITIVE_INFINITY : nextOpen;
    const closeIdx = nextClose === -1 ? Number.POSITIVE_INFINITY : nextClose;
    const nextIdx = Math.min(openIdx, closeIdx);

    if (nextIdx === Number.POSITIVE_INFINITY) {
      collected.push(chunk.slice(i));
      return {
        foundEnd: false,
        content: collected.join(""),
        closeOffset: -1,
        depthAfter: depth,
      };
    }

    if (nextIdx === closeIdx) {
      collected.push(chunk.slice(i, closeIdx));

      if (depth > 0) {
        depth -= 1;
        collected.push(CLOSE);
        i = closeIdx + CLOSE.length;
        continue;
      }

      return {
        foundEnd: true,
        content: collected.join(""),
        closeOffset: closeIdx,
        depthAfter: depth,
      };
    }

    // nextIdx === openIdx
    collected.push(chunk.slice(i, openIdx));
    collected.push(OPEN);
    depth += 1;
    i = openIdx + OPEN.length;
  }

  return {
    foundEnd: false,
    content: collected.join(""),
    closeOffset: -1,
    depthAfter: depth,
  };
};

export const installConditionalInlineMarkdownIt = (
  md,
  { defaultCondition },
) => {
  if (md.__notifyConditionalInlineInstalled) return;
  md.__notifyConditionalInlineInstalled = true;

  md.inline.ruler.before("text", "conditional_inline", (state, silent) => {
    const start = state.pos;
    const max = state.posMax;

    if (state.env?.__notifyDisableConditional === true) return false;
    if (state.env?.__notifyDisableConditionalInline === true) return false;

    if (start + 8 > max) return false;
    if (state.src.slice(start, start + 2) !== OPEN) return false;

    const condStart = start + 2;
    const condEnd = state.src.indexOf("??", condStart);
    if (condEnd === -1 || condEnd >= max) return false;

    const conditionRaw = state.src.slice(condStart, condEnd);
    if (conditionRaw.includes("\n")) return false;

    const bodyStart = condEnd + 2;
    const chunk = state.src.slice(bodyStart, max);
    const scanned = scanConditionalBodyForClose(chunk);
    if (!scanned.foundEnd) return false;

    const closeIdx = bodyStart + scanned.closeOffset;
    const condition = conditionRaw.trim();
    const content = scanned.content;

    if (content.includes("\n")) return false;
    // Both sides must be present.
    // Invalid examples:
    // - ((??content))
    // - (( ??content))
    // - ((conditional??))
    // - ((conditional?? ))
    if (!condition) return false;
    if (!content.trim()) return false;

    if (silent) {
      state.pos = closeIdx + 2;
      return true;
    }

    const tokenOpen = state.push("conditional_inline_open", "span", 1);
    tokenOpen.attrs = [
      ["data-type", "conditional-inline"],
      ["data-condition", condition],
    ];

    const innerTokens = [];
    const prevDisable = state.env.__notifyDisableConditionalInline;
    state.env.__notifyDisableConditionalInline = true;
    state.md.inline.parse(content, state.md, state.env, innerTokens);
    if (prevDisable === undefined) {
      delete state.env.__notifyDisableConditionalInline;
    } else {
      state.env.__notifyDisableConditionalInline = prevDisable;
    }

    // Keep token nesting consistent so downstream consumers (eg tiptap-markdown)
    // treat the parsed inline tokens as children of the conditional wrapper.
    for (const t of innerTokens) {
      if (typeof t.level === "number") t.level += 1;
      state.tokens.push(t);
    }

    state.push("conditional_inline_close", "span", -1);
    state.pos = closeIdx + 2;
    return true;
  });

  installConditionalRendererRules(md, {
    openRule: "conditional_inline_open",
    closeRule: "conditional_inline_close",
    tag: "span",
    dataType: "conditional-inline",
    className: "conditional-inline",
    defaultCondition,
  });
};

export const installConditionalBlockMarkdownIt = (md, { defaultCondition }) => {
  if (md.__notifyConditionalBlockInstalled) return;
  md.__notifyConditionalBlockInstalled = true;

  md.block.ruler.before(
    "paragraph",
    "conditional_block",
    (state, start, end, silent) => {
      if (state.env?.__notifyDisableConditional === true) return false;

      const startPattern = /^\(\(([^?]+)\?\?/;

      let pos = state.bMarks[start] + state.tShift[start];
      let max = state.eMarks[start];
      let line = state.src.slice(pos, max);

      const match = line.match(startPattern);
      if (!match) return false;

      const condition = match[1].trim();
      const startMarkerLength = match[0].length;

      let depth = 0;
      let foundEnd = false;
      let nextLine = start;
      const collected = [];

      const feed = (chunk) => {
        const scanned = scanConditionalBodyForClose(chunk, {
          initialDepth: depth,
        });
        depth = scanned.depthAfter;
        collected.push(scanned.content);
        if (scanned.foundEnd) foundEnd = true;
      };

      feed(line.slice(startMarkerLength));

      while (!foundEnd) {
        nextLine += 1;
        if (nextLine >= end) break;

        collected.push("\n");
        pos = state.bMarks[nextLine] + state.tShift[nextLine];
        max = state.eMarks[nextLine];
        line = state.src.slice(pos, max);
        feed(line);
      }

      if (!foundEnd) return false;

      // Reject single-line conditionals - those should be handled inline.
      if (nextLine === start) return false;

      if (silent) return true;

      let token = state.push("conditional_block_open", "div", 1);
      token.markup = `((${condition}??`;
      token.block = true;
      token.info = condition;
      token.map = [start, nextLine + 1];
      token.attrSet("data-condition", condition);

      const content = collected.join("");
      if (content.trim()) {
        const innerEnv = {
          ...(state.env || {}),
          __notifyDisableConditional: true,
        };
        const innerTokens = [];
        state.md.block.parse(content, state.md, innerEnv, innerTokens);

        for (const t of innerTokens) {
          if (typeof t.level === "number") t.level += 1;
          state.tokens.push(t);
        }
      } else {
        state.push("paragraph_open", "p", 1);
        state.push("paragraph_close", "p", -1);
      }

      token = state.push("conditional_block_close", "div", -1);
      token.markup = CLOSE;
      token.block = true;

      state.line = nextLine + 1;
      return true;
    },
  );

  installConditionalRendererRules(md, {
    openRule: "conditional_block_open",
    closeRule: "conditional_block_close",
    tag: "div",
    dataType: "conditional",
    className: "conditional-block",
    defaultCondition,
  });
};
