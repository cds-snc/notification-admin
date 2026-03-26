import Emoji, { emojis as standardEmojis } from "@tiptap/extension-emoji";
import { ReactRenderer } from "@tiptap/react";
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useState,
} from "react";

const MAX_EMOJI_RESULTS = 6;

const findEmojiByNameOrShortcode = (name) => {
  if (!name) {
    return undefined;
  }

  return standardEmojis.find(
    (item) => item.name === name || item.shortcodes?.includes(name),
  );
};

const positionPopup = (clientRect, element) => {
  if (!clientRect || !element) {
    return;
  }

  const rect = clientRect();
  if (!rect) {
    return;
  }

  Object.assign(element.style, {
    left: `${Math.round(rect.left)}px`,
    top: `${Math.round(rect.bottom + 8)}px`,
    position: "fixed",
  });
};

const EmojiList = forwardRef((props, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const selectItem = useCallback(
    (index) => {
      const item = props.items[index];

      if (item) {
        props.command({ name: item.name });
      }
    },
    [props],
  );

  const upHandler = useCallback(() => {
    setSelectedIndex(
      (selectedIndex + props.items.length - 1) % props.items.length,
    );
  }, [props.items.length, selectedIndex]);

  const downHandler = useCallback(() => {
    setSelectedIndex((selectedIndex + 1) % props.items.length);
  }, [props.items.length, selectedIndex]);

  const enterHandler = useCallback(() => {
    selectItem(selectedIndex);
  }, [selectItem, selectedIndex]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [props.items]);

  useImperativeHandle(
    ref,
    () => ({
      onKeyDown: ({ event }) => {
        if (event.key === "ArrowUp") {
          upHandler();
          return true;
        }

        if (event.key === "ArrowDown") {
          downHandler();
          return true;
        }

        if (event.key === "Enter") {
          enterHandler();
          return true;
        }

        return false;
      },
    }),
    [downHandler, enterHandler, upHandler],
  );

  if (!props.items.length) {
    return (
      <div className="emoji-suggestion-popup">
        <div className="emoji-suggestion-empty">No emoji found</div>
      </div>
    );
  }

  return (
    <div className="emoji-suggestion-popup">
      <ul className="emoji-suggestion-list">
        {props.items.map((item, index) => (
          <li className="emoji-suggestion-item" key={`${item.name}-${index}`}>
            <button
              type="button"
              className={`emoji-suggestion-button${index === selectedIndex ? " is-active" : ""}`}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => selectItem(index)}
            >
              <span className="emoji-suggestion-glyph">{item.emoji || "🙂"}</span>
              <span className="emoji-suggestion-text">:{item.name}:</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
});

EmojiList.displayName = "EmojiList";

const suggestion = {
  items: ({ editor, query }) => {
    return editor.storage.emoji.emojis
      .filter(({ shortcodes, tags }) => {
        const normalizedQuery = query.toLowerCase();

        return (
          shortcodes.find((shortcode) => shortcode.startsWith(normalizedQuery)) ||
          tags.find((tag) => tag.startsWith(normalizedQuery))
        );
      })
      .slice(0, MAX_EMOJI_RESULTS);
  },

  allowSpaces: false,

  render: () => {
    let component;

    return {
      onStart: (props) => {
        component = new ReactRenderer(EmojiList, {
          props,
          editor: props.editor,
        });

        document.body.appendChild(component.element);
        positionPopup(props.clientRect, component.element);
      },

      onUpdate: (props) => {
        component.updateProps(props);
        positionPopup(props.clientRect, component.element);
      },

      onKeyDown: (props) => {
        if (props.event.key === "Escape") {
          if (document.body.contains(component.element)) {
            document.body.removeChild(component.element);
          }

          component.destroy();
          return true;
        }

        return component.ref?.onKeyDown(props) || false;
      },

      onExit: () => {
        if (component && document.body.contains(component.element)) {
          document.body.removeChild(component.element);
        }

        component?.destroy();
      },
    };
  },
};

const EmojiPicker = Emoji.extend({
  renderMarkdown: (node) => {
    if (!node.attrs?.name) {
      return "";
    }

    const emojiItem = findEmojiByNameOrShortcode(node.attrs.name);
    return emojiItem?.emoji || `:${node.attrs.name}:`;
  },

  addStorage() {
    const parentStorage = this.parent?.() || {};

    return {
      ...parentStorage,
      markdown: {
        serialize: (state, node) => {
          const emojiItem = findEmojiByNameOrShortcode(node.attrs?.name);

          state.write(emojiItem?.emoji || `:${node.attrs?.name || ""}:`);
        },
      },
    };
  },
}).configure({
  emojis: standardEmojis,
  enableEmoticons: true,
  suggestion,
});

export default EmojiPicker;
