import { Node } from "@tiptap/core";
import {
  NodeSelection,
  Plugin,
  PluginKey,
  TextSelection,
} from "@tiptap/pm/state";
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

  addOptions() {
    return {
      HTMLAttributes: {},
      prefix: "IF ",
      suffix: " is YES",
      defaultCondition: "condition",
      conditionAriaLabel: "Condition",
    };
  },

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
    const NAV_BLOCK_PARA_META = "__notifyConditionalBlockNavParagraph";
    const navBlockParaKey = new PluginKey("notifyConditionalBlockNavParagraph");

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
                condition:
                  (match[1] || this.options.defaultCondition).trim() ||
                  this.options.defaultCondition,
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

      // Plugin: document-order Tab navigation for embedded focusable controls.
      // This ensures Tab moves focus to controls that appear AFTER the cursor,
      // and Shift+Tab moves to controls BEFORE the cursor.
      new Plugin({
        props: {
          handleKeyDown(view, event) {
            // Block conditional: if you're at the beginning of the content and press ArrowLeft,
            // move into the condition input (caret at the end).
            if (
              event.key === "ArrowLeft" &&
              !event.shiftKey &&
              !event.altKey &&
              !event.metaKey
            ) {
              try {
                const { state } = view;
                const { selection } = state;
                if (!selection?.empty) return false;

                const { $from } = selection;

                for (let depth = $from.depth; depth > 0; depth--) {
                  if ($from.node(depth).type !== conditionalType) continue;

                  const conditionalPos = $from.before(depth);
                  const contentStart = $from.start(depth);

                  // At the earliest caret position inside the conditional content.
                  if ($from.pos !== contentStart + 1) return false;

                  const nodeDom = view.nodeDOM(conditionalPos);
                  const input = nodeDom?.querySelector?.(
                    "input.conditional-block-condition-input",
                  );

                  if (!input) return false;

                  event.preventDefault();
                  input.focus?.();
                  const end = input.value?.length ?? 0;
                  input.setSelectionRange?.(end, end);
                  return true;
                }
              } catch {
                return false;
              }
            }

            if (event.key !== "Tab") return false;

            // Special case: temporary navigation space before an initial inline
            // conditional. The browser's default tab order can focus the inline
            // input without letting the inline plugin delete the space. Handle
            // Tab/Shift+Tab here deterministically.
            try {
              const { doc, selection } = view.state;
              const conditionalInline =
                view.state.schema.marks?.conditionalInline;

              if (conditionalInline && selection?.empty) {
                const pos = selection.from;
                const hasSpaceHere = doc.textBetween(pos, pos + 1) === " ";
                const next = doc.resolve(pos + 1).nodeAfter;
                const nextHasInline =
                  next?.isText &&
                  next.marks?.some((m) => m.type === conditionalInline);

                if (hasSpaceHere && nextHasInline) {
                  event.preventDefault();

                  if (event.shiftKey) {
                    // Shift+Tab -> toolbar
                    const toolbar = view.dom?.ownerDocument?.querySelector?.(
                      '[data-testid="rte-toolbar"]',
                    );
                    toolbar?.dispatchEvent?.(
                      new CustomEvent("rte-request-focus", { bubbles: true }),
                    );
                    return true;
                  }

                  // Tab -> delete space, then focus the inline input
                  const tr = view.state.tr;
                  tr.delete(pos, pos + 1);
                  tr.setSelection(
                    view.state.selection.constructor.near(tr.doc.resolve(pos)),
                  );
                  view.dispatch(tr);

                  setTimeout(() => {
                    try {
                      const input = view.dom?.querySelector?.(
                        "input.conditional-inline-condition-input[data-editor-focusable]",
                      );
                      input?.focus?.();
                      try {
                        const end = input?.value?.length ?? 0;
                        input?.setSelectionRange?.(end, end);
                      } catch {
                        // ignore
                      }
                    } catch {
                      // ignore
                    }
                  }, 0);

                  return true;
                }
              }
            } catch {
              // ignore
            }

            // Inline conditionals manage their own Tab/Shift+Tab behavior.
            // Avoid the global focus-cycling logic interfering.
            try {
              const conditionalInline =
                view.state.schema.marks?.conditionalInline;
              if (conditionalInline) {
                const marksHere = view.state.selection?.$from?.marks?.() || [];

                if (marksHere.some((m) => m.type === conditionalInline)) {
                  return false;
                }

                // Also bail out when we're in the temporary leading space
                // inserted before a first inline conditional.
                const { doc, selection } = view.state;
                if (selection?.empty && selection.from <= 2) {
                  const hasLeadingSpace = doc.textBetween(1, 2) === " ";
                  const next = doc.resolve(2).nodeAfter;
                  const nextHasInline =
                    next?.isText &&
                    next.marks?.some((m) => m.type === conditionalInline);

                  if (hasLeadingSpace && nextHasInline) {
                    return false;
                  }
                }
              }
            } catch {
              // ignore
            }

            // When typing inside an inline conditional's content, forward Tab
            // should not cycle back to its embedded input widget.
            // Let the browser handle Tab to move focus out of the editor.
            if (!event.shiftKey) {
              const conditionalInline =
                view.state.schema.marks?.conditionalInline;
              if (
                conditionalInline &&
                view.state.selection?.$from
                  ?.marks()
                  ?.some((m) => m.type === conditionalInline)
              ) {
                return false;
              }

              // If the user is positioned in the temporary leading space we add
              // to allow inserting before an initial inline conditional, don't
              // focus the inline input (that creates a loop between space/input).
              try {
                const { doc, selection } = view.state;
                if (selection?.empty && selection.from <= 2) {
                  const hasLeadingSpace = doc.textBetween(1, 2) === " ";
                  const next = doc.resolve(2).nodeAfter;
                  const nextHasInline =
                    conditionalInline &&
                    next?.isText &&
                    next.marks?.some((m) => m.type === conditionalInline);

                  if (hasLeadingSpace && nextHasInline) {
                    return false;
                  }
                }
              } catch {
                // ignore
              }
            }

            const editorDom = view.dom;
            // Find all focusable controls marked with our data attribute.
            const focusables = Array.from(
              editorDom.querySelectorAll("[data-editor-focusable]"),
            );
            if (focusables.length === 0) return false;

            // Map each focusable element to its ProseMirror document position.
            const withPos = focusables
              .map((el) => {
                try {
                  const pos = view.posAtDOM(el, 0);
                  return { el, pos };
                } catch {
                  return null;
                }
              })
              .filter(Boolean)
              .sort((a, b) => a.pos - b.pos);

            if (withPos.length === 0) return false;

            const cursorPos = view.state.selection.from;
            const shiftKey = event.shiftKey;

            let target = null;

            if (shiftKey) {
              // Shift+Tab: find the last focusable BEFORE cursor
              for (let i = withPos.length - 1; i >= 0; i--) {
                // If the caret is at the very start of a marked range, the
                // associated focusable (eg inline conditional input) can map to
                // the same ProseMirror position as the cursor.
                // Treat that as "before" for Shift+Tab.
                if (withPos[i].pos <= cursorPos) {
                  target = withPos[i].el;
                  break;
                }
              }
            } else {
              // Tab: find the first focusable AFTER cursor
              for (const item of withPos) {
                if (item.pos > cursorPos) {
                  target = item.el;
                  break;
                }
              }
            }

            if (target) {
              event.preventDefault();
              target.focus();
              return true;
            }

            // No target found in the desired direction → let browser handle
            // (moves focus out of editor).
            return false;
          },
        },
      }),

      // Plugin: temporary navigation paragraph for block conditional input.
      // When ArrowLeft at the beginning of the block condition input exits to
      // the previous line, and there is no previous line, we insert an empty
      // paragraph before the block. If ArrowRight is then pressed at the end
      // of that empty paragraph, delete it and re-focus the condition input
      // with caret at the start.
      new Plugin({
        key: navBlockParaKey,
        state: {
          init() {
            return { pos: null };
          },
          apply(tr, prev) {
            let pos = prev?.pos ?? null;

            const meta = tr.getMeta(NAV_BLOCK_PARA_META);
            if (meta === null) {
              pos = null;
            } else if (typeof meta === "number") {
              pos = meta;
            }

            if (typeof pos === "number" && tr.docChanged) {
              pos = tr.mapping.map(pos, -1);
            }

            // Validate that the tracked paragraph still exists, is empty, and
            // is immediately followed by a conditional block.
            if (typeof pos === "number") {
              const para = tr.doc.nodeAt(pos);
              if (
                !para ||
                para.type.name !== "paragraph" ||
                para.textContent !== "" ||
                para.nodeSize !== 2
              ) {
                pos = null;
              } else {
                const nextPos = pos + para.nodeSize;
                const nextNode = tr.doc.nodeAt(nextPos);
                if (!nextNode || nextNode.type !== conditionalType) {
                  pos = null;
                }
              }
            }

            return { pos };
          },
        },
        props: {
          handleKeyDown(view, event) {
            if (
              event.key !== "ArrowRight" ||
              event.shiftKey ||
              event.altKey ||
              event.metaKey
            ) {
              return false;
            }

            const pluginState = navBlockParaKey.getState(view.state);
            const navPos = pluginState?.pos;
            if (typeof navPos !== "number") return false;

            const { state } = view;
            const { selection } = state;
            if (!selection?.empty) return false;

            const para = state.doc.nodeAt(navPos);
            if (!para) return false;

            const paraEnd = navPos + para.nodeSize - 1;
            if (selection.from !== paraEnd) return false;

            const nextPos = navPos + para.nodeSize;
            const nextNode = state.doc.nodeAt(nextPos);
            if (!nextNode || nextNode.type !== conditionalType) return false;

            event.preventDefault();

            const tr = state.tr.delete(navPos, navPos + para.nodeSize);
            tr.setMeta(NAV_BLOCK_PARA_META, null);

            // Keep a stable editor selection (inside the conditional content)
            // while focus returns to the input. Avoid NodeSelection here because
            // other plugins may auto-focus the trigger button.
            const insideContentPos = Math.min(navPos + 2, tr.doc.content.size);
            tr.setSelection(TextSelection.create(tr.doc, insideContentPos));
            view.dispatch(tr);

            setTimeout(() => {
              try {
                const nodeDom = view.nodeDOM(navPos);
                const input = nodeDom?.querySelector?.(
                  "input.conditional-block-condition-input",
                );
                      const setCaretStart = () => {
                        try {
                          input?.focus?.();
                          input?.setSelectionRange?.(0, 0);
                          if (input) input.scrollLeft = 0;
                        } catch {
                          // ignore
                        }
                      };

                      setCaretStart();
                      requestAnimationFrame(() => setCaretStart());
              } catch {
                // ignore
              }
            }, 0);

            return true;
          },
        },
      }),

      // Plugin: auto-focus the conditional trigger when cursor moves to the node boundary.
      // When the user arrows into a conditional block (selection at node start),
      // we focus the trigger button so they can interact with it via keyboard.
      new Plugin({
        view() {
          let lastFocusedPos = null;
          let lastCursorPos = null;

          return {
            update(view, prevState) {
              const { state } = view;
              // Only act when selection changed
              if (prevState.selection.eq(state.selection)) {
                return;
              }

              const { selection } = state;
              const { $from } = selection;
              const prevCursorPos = lastCursorPos;
              const currentCursorPos = $from.pos;
              lastCursorPos = currentCursorPos;

              // Helper to focus trigger at a given DOM pos
              const focusTriggerAtDomPos = (domPos) => {
                const nodeDom = view.nodeDOM(domPos);
                const trigger = nodeDom?.querySelector?.(
                  "[data-editor-focusable]",
                );
                if (!trigger) return false;

                // If already focused, skip
                if (document.activeElement === trigger) return true;

                lastFocusedPos = domPos;
                setTimeout(() => trigger.focus(), 0);
                return true;
              };

              // Case A: NodeSelection of the conditional itself
              if (
                selection instanceof NodeSelection &&
                selection.node?.type?.name === "conditional"
              ) {
                focusTriggerAtDomPos(selection.from);
                return;
              }

              // Case B: Text cursor near the start of a conditional's content
              for (let depth = $from.depth; depth > 0; depth--) {
                const node = $from.node(depth);
                if (node.type.name !== "conditional") continue;

                const conditionalDomPos = $from.before(depth);
                // Try to compute the trigger's pos via the DOM element
                const nodeDom = view.nodeDOM(conditionalDomPos);
                const triggerEl = nodeDom?.querySelector?.(
                  "[data-editor-focusable]",
                );

                if (!triggerEl) break;

                // Determine the trigger's document position
                let triggerPos = null;
                try {
                  triggerPos = view.posAtDOM(triggerEl, 0);
                } catch (e) {
                  triggerPos = null;
                }

                const cursorPos = $from.pos;

                // Determine navigation direction: true if moving forward, false if moving backward
                const movingForward =
                  prevCursorPos === null || cursorPos > prevCursorPos;

                // Only auto-focus trigger when moving forward into the conditional.
                // When moving backward (from after the block), let cursor navigate into content first.
                const shouldFocus =
                  movingForward &&
                  ((typeof triggerPos === "number" &&
                    cursorPos <= triggerPos) ||
                    cursorPos <= $from.start(depth) + 1);

                if (shouldFocus) {
                  focusTriggerAtDomPos(conditionalDomPos);
                } else if (lastFocusedPos === conditionalDomPos) {
                  // Cursor moved away from this conditional, blur the trigger
                  const nodeDomNow = view.nodeDOM(conditionalDomPos);
                  const triggerNow = nodeDomNow?.querySelector?.(
                    "[data-editor-focusable]",
                  );
                  if (triggerNow && document.activeElement === triggerNow) {
                    // Move focus back to editor so user continues typing
                    setTimeout(() => view.focus(), 0);
                  }
                  lastFocusedPos = null;
                }

                break;
              }
            },
          };
        },
      }),
    ];
  },

  addStorage() {
    const defaultCondition = this.options.defaultCondition;

    return {
      markdown: {
        serialize(state, node) {
          const condition = node.attrs.condition || defaultCondition;

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
              // Custom block rule to parse multi-line block conditionals.
              // Single-line conditionals like ((condition??content)) within text
              // are handled by ConditionalInlineMark instead.
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

                  // Reject single-line conditionals - those should be handled by ConditionalInlineMark
                  // Block conditionals must span multiple lines (nextLine > start)
                  if (nextLine === start) {
                    return false;
                  }

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
                  token.attrGet("data-condition") || defaultCondition;
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
        (condition) =>
        ({ commands, editor }) => {
          // Do not allow nested conditionals.
          if (editor.isActive(this.name)) return false;

          const nextCondition =
            (condition || "").trim() || this.options.defaultCondition;
          return commands.insertContent({
            type: this.name,
            attrs: { condition: nextCondition },
            content: [
              {
                type: "paragraph",
              },
            ],
          });
        },

      // Command to wrap selection in conditional block
      wrapInConditional:
        (condition) =>
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

          const nextCondition =
            (condition || "").trim() || this.options.defaultCondition;

          return commands.wrapIn(this.name, { condition: nextCondition });
        },

      // Command to toggle the conditional block
      toggleConditional:
        (condition) =>
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
            const nextCondition =
              (condition || "").trim() || this.options.defaultCondition;
            return commands.wrapIn(this.name, { condition: nextCondition });
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
            { condition: this.options.defaultCondition },
            paragraph,
          );

          const tr = state.tr.replaceSelectionWith(conditionalNode);

          // Selection is placed after the inserted node; recover the node start.
          const insertedPos = tr.selection.from - conditionalNode.nodeSize;
          tr.setSelection(NodeSelection.create(tr.doc, insertedPos));
          tr.scrollIntoView();

          dispatch(tr);

          // Focus the condition input for quick editing.
          setTimeout(() => {
            try {
              const nodeDom =
                editor.view.nodeDOM(insertedPos) ||
                editor.view.nodeDOM(editor.state.selection.from);
              const inputEl = nodeDom?.querySelector?.(
                "[data-editor-focusable]",
              );
              if (!inputEl) return;

              inputEl.focus();
              inputEl.select?.();
            } catch (err) {
              // ignore
            }
          }, 0);

          return true;
        },
    };
  },

  addKeyboardShortcuts() {
    return {
      ArrowUp: ({ editor }) => {
        const { state } = editor;
        const { selection } = state;
        const { $from } = selection;

        // Check if we're inside a conditional at or near the beginning
        for (let depth = $from.depth; depth > 0; depth--) {
          const node = $from.node(depth);
          if (node.type.name !== this.name) continue;

          const conditionalStart = $from.start(depth);
          const cursorPos = $from.pos;

          // If cursor is at or very close to the start of the conditional content
          // (within first few characters), prevent default up arrow and let the
          // auto-focus plugin handle focusing the trigger
          if (cursorPos <= conditionalStart + 3) {
            // Find and focus the trigger button
            setTimeout(() => {
              try {
                const conditionalDomPos = $from.before(depth);
                const nodeDom = editor.view.nodeDOM(conditionalDomPos);
                const triggerEl = nodeDom?.querySelector?.(
                  "[data-editor-focusable]",
                );
                if (triggerEl) {
                  triggerEl.focus();
                }
              } catch (err) {
                // Ignore
              }
            }, 0);
            return true; // Prevent default arrow behavior
          }
          break;
        }

        return false; // Allow default arrow behavior
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
