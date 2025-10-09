export const onKeyDown = ({ key, dispatch }) => {
  if (key.match(/Up|Down|Left|Right|Home|End|PageUp|PageDown/)) {
    switch (key) {
      case "Right":
        dispatch({ type: "KEY_RIGHT", payload: "" });
        break;
      case "Left":
        dispatch({ type: "KEY_LEFT", payload: "" });
        break;
      case "Up":
        dispatch({ type: "KEY_UP", payload: "" });
        break;
      case "Down":
        dispatch({ type: "KEY_DOWN", payload: "" });
        break;
      case "Home":
        dispatch({ type: "KEY_HOME", payload: "" });
        break;
      case "End":
        dispatch({ type: "KEY_END", payload: "" });
        break;
      case "PageUp":
        dispatch({ type: "KEY_PAGEUP", payload: "" });
        break;
      case "PageDown":
        dispatch({ type: "KEY_PAGEDOWN", payload: "" });
        break;
      default:
    }
  }

  return null;
};
