import Emoji, { emojis as standardEmojis } from "@tiptap/extension-emoji";
import { ReactRenderer } from "@tiptap/react";
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

const MAX_EMOJI_RESULTS = 6;

// Stable IDs used to wire the ARIA combobox ↔ listbox relationship.
const LISTBOX_ID = "emoji-suggestion-listbox";

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
  const [announcement, setAnnouncement] = useState("");
  // Only update aria-activedescendant after the user has pressed an arrow key.
  // This prevents the initial mount from suppressing the live-region announcement.
  const navigatedRef = useRef(false);

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
    navigatedRef.current = true;
    setSelectedIndex(
      (selectedIndex + props.items.length - 1) % props.items.length,
    );
  }, [props.items.length, selectedIndex]);

  const downHandler = useCallback(() => {
    navigatedRef.current = true;
    setSelectedIndex((selectedIndex + 1) % props.items.length);
  }, [props.items.length, selectedIndex]);

  const enterHandler = useCallback(() => {
    selectItem(selectedIndex);
  }, [selectItem, selectedIndex]);

  // Reset navigation tracking and selection when the query changes.
  useEffect(() => {
    navigatedRef.current = false;
    setSelectedIndex(0);
  }, [props.items]);

  // Announce when the suggestion list appears or the results change so
  // screen-reader users know the dropdown is active.
  useEffect(() => {
    const msg =
      props.items.length > 0
        ? `${props.items.length} emoji suggestion${props.items.length !== 1 ? "s" : ""} available. Use arrow keys to navigate.`
        : "No emoji found.";
    // Small delay lets the popup mount before the live-region fires.
    const id = setTimeout(() => setAnnouncement(msg), 100);
    return () => clearTimeout(id);
  }, [props.items]);

  // Wire the ARIA combobox pattern on the editor's contenteditable element so
  // screen readers (VoiceOver etc.) announce the popup as a listbox dropdown.
  useEffect(() => {
    const editorDom = props.editor?.view?.dom;
    if (!editorDom) return;

    editorDom.setAttribute("aria-expanded", "true");
    editorDom.setAttribute("aria-haspopup", "listbox");
    editorDom.setAttribute("aria-controls", LISTBOX_ID);
    editorDom.setAttribute("aria-autocomplete", "list");

    return () => {
      editorDom.removeAttribute("aria-expanded");
      editorDom.removeAttribute("aria-haspopup");
      editorDom.removeAttribute("aria-controls");
      editorDom.removeAttribute("aria-autocomplete");
      editorDom.removeAttribute("aria-activedescendant");
    };
  }, [props.editor]);

  // Keep aria-activedescendant in sync with keyboard navigation.
  // We only do this after the user has pressed an arrow key so that the
  // live-region opening announcement isn't swamped by an immediate
  // activedescendant change on mount.
  useEffect(() => {
    const editorDom = props.editor?.view?.dom;
    if (!editorDom || !props.items.length || !navigatedRef.current) return;

    const selectedItem = props.items[selectedIndex];
    if (selectedItem) {
      editorDom.setAttribute(
        "aria-activedescendant",
        `emoji-option-${selectedItem.name}`,
      );
    }
  }, [props.editor, props.items, selectedIndex]);

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

  return (
    <div className="emoji-suggestion-popup">
      {/* Live region: announces suggestion count to screen readers on open/change */}
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </span>
      {props.items.length === 0 ? (
        <div className="emoji-suggestion-empty">No emoji found</div>
      ) : (
        <ul
          id={LISTBOX_ID}
          className="emoji-suggestion-list"
          role="listbox"
          aria-label="Emoji suggestions"
        >
          {props.items.map((item, index) => (
            <li className="emoji-suggestion-item" key={`${item.name}-${index}`}>
              <button
                id={`emoji-option-${item.name}`}
                type="button"
                role="option"
                aria-selected={index === selectedIndex}
                className={`emoji-suggestion-button${index === selectedIndex ? " is-active" : ""}`}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectItem(index)}
                tabIndex={-1}
              >
                <span className="emoji-suggestion-glyph">
                  {item.emoji || "🙂"}
                </span>
                <span className="emoji-suggestion-text">:{item.name}:</span>
              </button>
            </li>
          ))}
        </ul>
      )}
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
          shortcodes.find((shortcode) =>
            shortcode.startsWith(normalizedQuery),
          ) || tags.find((tag) => tag.startsWith(normalizedQuery))
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
