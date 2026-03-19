import React, { useState } from "react";
import "./tooltip.compiled.css";

const TooltipWrapper = ({ children, label, shortcut }) => {
  const [visible, setVisible] = useState(false);
  const ref = React.useRef(null);

  const show = () => setVisible(true);
  const hide = () => setVisible(false);

  const child = React.Children.only(children);
  const cloned = React.cloneElement(child, {
    onMouseEnter: (e) => {
      show();
      if (child.props.onMouseEnter) child.props.onMouseEnter(e);
    },
    onMouseLeave: (e) => {
      hide();
      if (child.props.onMouseLeave) child.props.onMouseLeave(e);
    },
    onFocus: (e) => {
      show();
      if (child.props.onFocus) child.props.onFocus(e);
    },
    onBlur: (e) => {
      hide();
      if (child.props.onBlur) child.props.onBlur(e);
    },
    ref,
  });

  return (
    <span className="rte-tooltip-wrapper">
      {cloned}
      {visible && (
        <div role="tooltip" className="rte-tooltip-box">
          <div
            className={
              shortcut ? "rte-tooltip-label" : "rte-tooltip-label no-shortcut"
            }
          >
            {label}
          </div>
          {shortcut && <div className="rte-tooltip-shortcut">{shortcut}</div>}
          <div aria-hidden="true" className="rte-tooltip-caret" />
        </div>
      )}
    </span>
  );
};

export default TooltipWrapper;
