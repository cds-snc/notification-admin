import {
  ApplySchemaAttributes,
  command,
  CommandFunction,
  extension,
  ExtensionTag,
  getTextSelection,
  keyBinding,
  KeyBindingProps,
  MarkExtension,
  MarkExtensionSpec,
  MarkSpecOverride,
  PrimitiveSelection,
  toggleMark,
} from 'remirror';

@extension({
  defaultOptions: {
    defaultColor: 'rgb(255 191 71)',
  },
})
export class HighlightExtension extends MarkExtension {
  get name() {
    return 'highlight';
  }

  createTags() {
    return [ExtensionTag.FormattingMark, ExtensionTag.FontStyle];
  }

  createMarkSpec(extra, override) {
    return {
      ...override,
      attrs: {
        ...extra.defaults(),
        color: { default: this.options.defaultColor },
      },
      parseDOM: [
        {
          tag: 'mark',
          getAttrs: (node) => {
            if (typeof node === 'string') return false;
            return {
              ...extra.parse(node),
              color: node.style.backgroundColor || this.options.defaultColor,
            };
          },
        },
        ...(override.parseDOM ?? []),
      ],
      toDOM: (mark) => {
        // We can customize the mark rendering here and add aria attrs if needed
        return [
            'mark',
            {
              style: `background-color: ${mark.attrs.color}`,
            },
            0,
        ];
      },
    };
  }

  @command()
  toggleHighlight(color, selection) {
    return toggleMark({
      type: this.type,
      attrs: { color: color || this.options.defaultColor },
      selection,
    });
  }

  @command()
  setHighlight(color, selection) {
    return ({ tr, dispatch }) => {
      const { from, to } = getTextSelection(selection ?? tr.selection, tr.doc);
      dispatch?.(tr.addMark(from, to, this.type.create({
        color: color || this.options.defaultColor,
      })));
      return true;
    };
  }

  @command()
  removeHighlight(selection) {
    return ({ tr, dispatch }) => {
      const { from, to } = getTextSelection(selection ?? tr.selection, tr.doc);

      if (!tr.doc.rangeHasMark(from, to, this.type)) {
        return false;
      }

      dispatch?.(tr.removeMark(from, to, this.type));
      return true;
    };
  }

  @keyBinding({ shortcut: 'Mod-Shift-h', command: 'toggleHighlight' })
  shortcut(props) {
    return this.toggleHighlight()(props);
  }
}