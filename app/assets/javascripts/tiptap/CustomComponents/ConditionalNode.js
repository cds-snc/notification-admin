import { Node, InputRule } from "@tiptap/core";
import { NodeSelection, Plugin } from "@tiptap/pm/state";
import { ReactNodeViewRenderer } from "@tiptap/react";

import ConditionalNodeView from "./ConditionalNodeView";

// A block node that conditionally renders template content.
// Example: ((under18??Please get your application signed by a parent or guardian.))
const ConditionalNode = Node.create({
  name: "conditional",

  // Allow this node to contain other content and nodes
  content: "block+",

  // Block level node, it can wrap other content
  group: "block",

  // Allow this node to be selected as a whole
  selectable: true,

  // Prevent the node from being filled with itself during auto-fill
  defining: true,

  addAttributes() {
    return {
      condition: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-condition"),
        renderHTML: (attributes) => {
          if (!attributes.condition) {
            return {};
          }
          return {
            "data-condition": attributes.condition,
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="conditional"]',
        getAttrs: (element) => ({
          condition: element.getAttribute("data-condition"),
        }),
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      {
        "data-type": "conditional",
        "data-condition": HTMLAttributes.condition || "",
        class: "conditional-block",
        ...HTMLAttributes,
      },
      0,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ConditionalNodeView);
  },

  addInputRules() {
    return [
      // Match ((condition??content)) pattern - must contain ?? to be a conditional
      new InputRule({
        find: /\(\(([^?)]+)\?\?([^)]*)\)\)$/,
        handler: ({ state, range, match }) => {
          // Do not allow nested conditionals.
          const $from = state.selection.$from;
          for (let depth = $from.depth; depth > 0; depth--) {
            if ($from.node(depth).type === this.type) {
              return null;
            }
          }

          const condition = match[1]?.trim() || "condition";
          const content = match[2]?.trim() || "";

          const { tr } = state;

          // Delete the matched text
          tr.delete(range.from, range.to);

          // Create the conditional node with content
          const conditionalNode = this.type.create(
            { condition },
            content
              ? state.schema.nodes.paragraph.create(
                  null,
                  state.schema.text(content),
                )
              : state.schema.nodes.paragraph.create(),
          );

          // Insert the conditional node
          tr.insert(range.from, conditionalNode);

          return tr;
        },
      }),
    ];
  },

  addProseMirrorPlugins() {
    /**
     * Plugin to auto-wrap text between standalone conditional markers into a conditional node.
     *
     * Example:
     * Various nodes, blocks or marks exist and the user manually types the conditional markers to wrap that
     * content in a conditional block:
     * ((condition?? <-- manually typed
     *   - lots of
     *   ((potential))
     *   # for additional
     *   [content](http://yes.com)
     * )) <-- manually typed
     */
    const conditionalType = this.type;
    const AUTO_WRAP_META = "__notifyConditionalAutoWrap";

    const isInsideConditional = ($pos) => {
      for (let depth = $pos.depth; depth > 0; depth--) {
        if ($pos.node(depth).type === conditionalType) return true;
      }
      return false;
    };

    const selectionContainsConditional = (state) => {
      const { from, to } = state.selection;
      let found = false;

      state.doc.nodesBetween(from, to, (node) => {
        if (node.type === conditionalType) {
          found = true;
          return false;
        }
        return !found;
      });

      return found;
    };

    return [
      new Plugin({
        appendTransaction: (transactions, oldState, newState) => {
          if (!transactions.some((tr) => tr.docChanged)) return null;
          if (transactions.some((tr) => tr.getMeta(AUTO_WRAP_META)))
            return null;

          // No nested conditionals, this aligns with the current conditional behaviour in notify
          if (isInsideConditional(newState.selection.$from)) return null;
          // Prevent wrapping of existing conditionals within another conditional
          if (selectionContainsConditional(newState)) return null;

          let startMarker = null;
          let endMarker = null;

          // We support a "wrapper" form where the markers are standalone paragraphs:
          // ((condition??
          // ...blocks...
          // ))
          newState.doc.descendants((node, pos) => {
            if (endMarker) return false;
            if (node.type.name !== "paragraph") return;

            const text = node.textContent || "";
            const trimmed = text.trim();

            if (!startMarker) {
              const match = trimmed.match(/^\(\(([^?]+)\?\?\s*$/);
              if (!match) return;

              const $start = newState.doc.resolve(pos);
              if (isInsideConditional($start)) return;

              startMarker = {
                pos,
                nodeSize: node.nodeSize,
                condition: (match[1] || "condition").trim() || "condition",
              };
              return;
            }

            if (trimmed === "))") {
              endMarker = {
                pos,
                nodeSize: node.nodeSize,
              };
            }
          });

          if (!startMarker || !endMarker) return null;
          if (endMarker.pos <= startMarker.pos) return null;

          const betweenFrom = startMarker.pos + startMarker.nodeSize;
          const betweenTo = endMarker.pos;

          // Extract the block content between markers.
          const slice = newState.doc.slice(betweenFrom, betweenTo);

          // Prevent nesting: if the wrapped content contains conditionals, do nothing.
          let containsConditional = false;
          slice.content.descendants((n) => {
            if (n.type === conditionalType) {
              containsConditional = true;
              return false;
            }
          });
          if (containsConditional) return null;

          const content =
            slice.content && slice.content.childCount
              ? slice.content
              : newState.schema.nodes.paragraph.create();

          const conditionalNode = conditionalType.create(
            { condition: startMarker.condition },
            content,
          );

          const tr = newState.tr.replaceWith(
            startMarker.pos,
            endMarker.pos + endMarker.nodeSize,
            conditionalNode,
          );

          tr.setMeta(AUTO_WRAP_META, true);
          tr.setSelection(NodeSelection.create(tr.doc, startMarker.pos));
          tr.scrollIntoView();

          return tr;
        },
      }),
    ];
  },

  addStorage() {
    return {
      markdown: {
        serialize(state, node) {
          const condition = node.attrs.condition || "condition";

          // Serialize in a stable multi-line form so round-tripping through
          // Rich and markdown editors doesn't accidentally concatenate block boundaries.
          state.write(`((${condition}??`);
          state.ensureNewLine();
          const contentStart = state.out.length;
          state.renderContent(node);

          const outBeforeBody = state.out.slice(0, contentStart);
          const rawBody = state.out.slice(contentStart);
          const body = normalizeConditionalBodyMarkdown(rawBody);
          state.out = outBeforeBody + body;

          state.write(`))`);
          state.closeBlock(node);
        },
        parse: {
          setup(markdownit) {
            markdownit.use((md) => {
              // Custom block rule to parse the inline, user-typed version of the conditional: ((condition??content))
              md.block.ruler.before(
                "paragraph",
                "conditional_block",
                (state, start, end, silent) => {
                  // Do not allow nested conditionals: when we're parsing the body
                  // of an outer conditional, treat any inner "((...??" as text.
                  if (state.env?.__notifyDisableConditional === true) {
                    return false;
                  }

                  const startPattern = /^\(\(([^?]+)\?\?/;

                  let pos = state.bMarks[start] + state.tShift[start];
                  let max = state.eMarks[start];
                  let line = state.src.slice(pos, max);

                  // Check if line starts with our pattern
                  const match = line.match(startPattern);
                  if (!match) return false;

                  const condition = match[1].trim();
                  const startMarkerLength = match[0].length;

                  // Find the matching end marker "))".
                  //
                  // Inside the conditional body we allow other "((...))" pairs
                  // (eg variables). Those inner pairs must NOT close the
                  // conditional, so we balance any inner "((" against " ))".
                  let innerParentDepth = 0;
                  let foundEnd = false;
                  let nextLine = start;
                  const collected = [];

                  const consumeChunk = (chunk) => {
                    let i = 0;

                    // Loop through the "content" portion of the conditional: ?? ... ))
                    while (i < chunk.length) {
                      const nextOpen = chunk.indexOf("((", i);
                      const nextClose = chunk.indexOf("))", i);
                      // Find the next marker, either '((' or '))'
                      const openIdx =
                        nextOpen === -1 ? Number.POSITIVE_INFINITY : nextOpen;
                      const closeIdx =
                        nextClose === -1 ? Number.POSITIVE_INFINITY : nextClose;
                      const nextIdx = Math.min(openIdx, closeIdx);
                      // If no inner open or close markers are found, then we're done the rest of the
                      // content is either literal text, other nodes, which we want to collect.
                      if (nextIdx === Number.POSITIVE_INFINITY) {
                        collected.push(chunk.slice(i));
                        return;
                      }

                      if (nextIdx === closeIdx) {
                        // Push our closing marker
                        collected.push(chunk.slice(i, closeIdx));

                        // check the depth we're at, if > 0 this closes an inner pair
                        // that's likely a variable or literal text. Continue until we're
                        // back to depth 0, which will be the closing of the conditional block.
                        if (innerParentDepth > 0) {
                          innerParentDepth -= 1;
                          collected.push("))");
                          i = closeIdx + 2;
                          continue;
                        }

                        // This closes the conditional block.
                        foundEnd = true;
                        return;
                      }

                      // If we found "((", then we're at an inner pair and adjust the current depth accordingly
                      collected.push(chunk.slice(i, openIdx));
                      collected.push("((");
                      innerParentDepth += 1;
                      i = openIdx + 2;
                    }
                  };

                  consumeChunk(line.slice(startMarkerLength));

                  while (!foundEnd) {
                    nextLine += 1;
                    if (nextLine >= end) break;

                    collected.push("\n");
                    pos = state.bMarks[nextLine] + state.tShift[nextLine];
                    max = state.eMarks[nextLine];
                    line = state.src.slice(pos, max);
                    consumeChunk(line);
                  }

                  if (!foundEnd) return false;
                  if (silent) return true;

                  let token = state.push("conditional_block_open", "div", 1);
                  token.markup = `((${condition}??`;
                  token.block = true;
                  token.info = condition;
                  token.map = [start, nextLine + 1];
                  token.attrSet("data-condition", condition);

                  const content = collected.join("");
                  if (content.trim()) {
                    // Disable conditional parsing inside the body.
                    const innerEnv = {
                      ...(state.env || {}),
                      __notifyDisableConditional: true,
                    };
                    const innerTokens = [];

                    // Parse only block structure here; markdown-it will run its
                    // core inline parsing pass afterwards to populate children.
                    // TODO: AI claims this, and I have no idea what it's talking about.
                    // Need to get a better handle on markdown-it parsing internals.
                    state.md.block.parse(
                      content,
                      state.md,
                      innerEnv,
                      innerTokens,
                    );

                    for (const t of innerTokens) {
                      if (typeof t.level === "number") t.level += 1;
                      state.tokens.push(t);
                    }
                  } else {
                    // Ensure the conditional always contains at least one block.
                    state.push("paragraph_open", "p", 1);
                    state.push("paragraph_close", "p", -1);
                  }

                  token = state.push("conditional_block_close", "div", -1);
                  token.markup = "))";
                  token.block = true;

                  state.line = nextLine + 1;
                  return true;
                },
              );

              // Add renderer
              md.renderer.rules.conditional_block_open = (tokens, idx) => {
                const token = tokens[idx];
                const condition =
                  token.attrGet("data-condition") || "condition";
                return `<div data-type="conditional" data-condition="${condition}" class="conditional-block">`;
              };
              md.renderer.rules.conditional_block_close = () => {
                return "</div>";
              };
            });
          },
        },
      },
    };
  },

  addCommands() {
    return {
      // Command to insert/add a conditional block with a specific condition
      setConditional:
        (condition = "condition") =>
        ({ commands, editor }) => {
          // Do not allow nested conditionals.
          if (editor.isActive(this.name)) return false;
          return commands.insertContent({
            type: this.name,
            attrs: { condition },
            content: [
              {
                type: "paragraph",
              },
            ],
          });
        },

      // Command to wrap selection in conditional block
      wrapInConditional:
        (condition = "condition") =>
        ({ commands, editor, state }) => {
          // Do not allow nested conditionals.
          if (editor.isActive(this.name)) return false;

          // Also disallow wrapping content that already contains conditionals.
          let containsConditional = false;
          state.doc.nodesBetween(
            state.selection.from,
            state.selection.to,
            (n) => {
              if (n.type === this.type) {
                containsConditional = true;
                return false;
              }
            },
          );
          if (containsConditional) return false;

          return commands.wrapIn(this.name, { condition });
        },

      // Command to toggle the conditional block
      toggleConditional:
        (condition = "condition") =>
        ({ commands, editor, state }) => {
          const isActive = editor.isActive(this.name);

          if (isActive) {
            // We're inside a conditional block, so unwrap it
            return commands.lift(this.name);
          } else {
            // Do not allow nested conditionals.
            if (editor.isActive(this.name)) return false;
            // Also disallow wrapping content that already contains conditionals.
            let containsConditional = false;
            state.doc.nodesBetween(
              state.selection.from,
              state.selection.to,
              (n) => {
                if (n.type === this.type) {
                  containsConditional = true;
                  return false;
                }
              },
            );
            if (containsConditional) return false;
            // Not inside a conditional block, so wrap selection in one
            return commands.wrapIn(this.name, { condition });
          }
        },

      // Command to remove/unwrap the conditional block
      unsetConditional:
        () =>
        ({ commands }) => {
          return commands.lift(this.name);
        },

      // Command to insert a conditional block
      insertConditionalPattern:
        () =>
        ({ state, dispatch, editor }) => {
          // Do not allow nested conditionals.
          if (editor.isActive(this.name)) return false;

          const paragraph = state.schema.nodes.paragraph.create();
          const conditionalNode = this.type.create(
            { condition: "condition" },
            paragraph,
          );

          const tr = state.tr.replaceSelectionWith(conditionalNode);

          // Selection is placed after the inserted node; recover the node start.
          const insertedPos = tr.selection.from - conditionalNode.nodeSize;
          tr.setSelection(NodeSelection.create(tr.doc, insertedPos));
          tr.scrollIntoView();

          dispatch(tr);

          // Focus and open the condition popover for quick editing.
          setTimeout(() => {
            try {
              const nodeDom =
                editor.view.nodeDOM(insertedPos) ||
                editor.view.nodeDOM(editor.state.selection.from);
              const triggerEl = nodeDom?.querySelector?.(
                ".conditional-trigger",
              );
              if (!triggerEl) return;

              triggerEl.focus();
              triggerEl.click();
            } catch (err) {
              // ignore
            }
          }, 0);

          return true;
        },
    };
  },
});

function normalizeConditionalBodyMarkdown(rendered) {
  // `state.renderContent` often emits block separators (`\n\n`) and sometimes
  // leading newlines depending on the first child block. For conditional blocks
  // we want a stable shape that round-trips cleanly between markdown and rich editor:
  // - body starts immediately after the newline following `??` (no blank line)
  // - body is either empty, or ends with exactly one trailing newline
  let body = String(rendered || "");

  // We always insert a newline after `??` ourselves, so remove any leading
  // newlines to avoid an extra blank line.
  body = body.replace(/^\n+/g, "");

  // If the body is effectively empty, keep it empty.
  if (body.trim() === "") return "";

  // Avoid trailing whitespace and normalize the ending to a single newline so
  // we don't end up with a blank line before the closing `))`.
  body = body.replace(/[\t ]+$/g, "");
  body = body.replace(/\n+$/g, "\n");
  return body;
}

export default ConditionalNode;
