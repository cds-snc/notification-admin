import { markInputRule, markPasteRule } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";

import { isInsideBlockConditional } from "./Helpers";
import { findConditionalMarks } from "./Decorations";
import { convertToBlockConditional } from "./Conversion";

export const createInputRules = (_extension, markType) => {
  const defaultCondition = _extension?.options?.defaultCondition || "condition";
  return [
    markInputRule({
      // Match ((condition??content)) pattern when typed inline
      // This will only trigger for single-line content
      find: /\(\(([^?)]+)\?\?([^)]*)\)\)$/,
      type: markType,
      getAttributes: (match) => {
        return {
          condition: (match[1] || defaultCondition).trim() || defaultCondition,
        };
      },
    }),
  ].map((rule) => {
    const originalHandler = rule.handler;
    rule.handler = (props) => {
      // Prevent inline conditionals inside block conditionals
      if (isInsideBlockConditional(props.state, props.range.from)) {
        return null;
      }
      return originalHandler(props);
    };
    return rule;
  });
};

export const createPasteRules = (_extension, markType) => {
  const defaultCondition = _extension?.options?.defaultCondition || "condition";
  return [
    markPasteRule({
      // Match single-line ((condition??content)) patterns during paste
      find: /\(\(([^?\n)]+)\?\?([^\n)]*)\)\)/g,
      type: markType,
      getAttributes: (match) => {
        return {
          condition: (match[1] || defaultCondition).trim() || defaultCondition,
        };
      },
    }),
  ].map((rule) => {
    const originalHandler = rule.handler;
    if (originalHandler) {
      rule.handler = (props) => {
        // Prevent inline conditionals inside block conditionals
        if (isInsideBlockConditional(props.state, props.range.from)) {
          return null;
        }
        return originalHandler(props);
      };
    }
    return rule;
  });
};

export const createKeyboardShortcuts = (_extension, markType) => {
  const defaultCondition = _extension?.options?.defaultCondition || "condition";
  return {
    Enter: ({ editor }) => {
      const { state } = editor;
      const { $from } = state.selection;

      const mark = $from.marks().find((m) => m.type === markType);
      if (!mark) return false;

      const condition = mark.attrs.condition || defaultCondition;
      return convertToBlockConditional(editor, {
        markType,
        condition,
        splitAtCursor: true,
      });
    },

    Space: ({ editor }) => {
      const { state } = editor;
      const { $from } = state.selection;

      const mark = $from.marks().find((m) => m.type === markType);
      if (!mark) return false;

      // Get the text before cursor in the current node
      const textBefore = $from.parent.textBetween(
        Math.max(0, $from.parentOffset - 10),
        $from.parentOffset,
        null,
        "\ufffc",
      );

      const condition = mark.attrs.condition || defaultCondition;

      // Check for heading patterns: # or ##
      if (/^#{1,6}$/.test(textBefore.trim())) {
        return convertToBlockConditional(editor, {
          markType,
          condition,
          splitAtCursor: false,
        });
      }

      // Check for list patterns: -, *, +, 1.
      if (
        /^[-*+]$/.test(textBefore.trim()) ||
        /^\d+\.$/.test(textBefore.trim())
      ) {
        return convertToBlockConditional(editor, {
          markType,
          condition,
          splitAtCursor: false,
        });
      }

      return false;
    },

    "-": ({ editor }) => {
      const { state } = editor;
      const { $from } = state.selection;

      const mark = $from.marks().find((m) => m.type === markType);
      if (!mark) return false;

      // Get the text before cursor
      const textBefore = $from.parent.textBetween(
        Math.max(0, $from.parentOffset - 2),
        $from.parentOffset,
        null,
        "\ufffc",
      );

      // Check for horizontal rule pattern: -- (will become --- after this dash)
      if (textBefore === "--") {
        const condition = mark.attrs.condition || defaultCondition;
        return convertToBlockConditional(editor, {
          markType,
          condition,
          splitAtCursor: false,
        });
      }

      return false;
    },
  };
};

export const createPlugins = (extension, markType) => {
  const decorationsKey = new PluginKey("conditionalInlineDecorations");

  const getDecorationSet = (doc) =>
    findConditionalMarks(doc, markType, {
      prefix: extension?.options?.prefix,
      suffix: extension?.options?.suffix,
      defaultCondition: extension?.options?.defaultCondition,
      conditionAriaLabel: extension?.options?.conditionAriaLabel,
    });

  return [
    new Plugin({
      key: decorationsKey,
      state: {
        init(_, { doc }) {
          return getDecorationSet(doc);
        },
        apply(tr, oldState) {
          return tr.docChanged ? getDecorationSet(tr.doc) : oldState;
        },
      },
      props: {
        decorations(state) {
          return this.getState(state);
        },
      },
    }),
  ];
};
