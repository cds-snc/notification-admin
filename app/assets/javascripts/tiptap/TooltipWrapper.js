import React, { useState, useRef } from "react";
import { useEditorContext } from "./EditorContext";
import { getNoShortcutLabel } from "./localization";
import "./tooltip.compiled.css";

const TooltipWrapper = ({ children, label, shortcut }) => {
  const [isVisible, setIsVisible] = useState(false);
  const { t } = useEditorContext();
  const tooltipRef = useRef(null);
  const targetRef = useRef(null);

  const showTooltip = () => setIsVisible(true);
  const hideTooltip = () => setIsVisible(false);

  return (
    <span
      className="rte-tooltip-wrapper"
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onFocus={showTooltip}
      onBlur={hideTooltip}
      ref={targetRef}
    >
      {React.cloneElement(children)}
      {isVisible && (
        <div
          ref={tooltipRef}
          className="rte-tooltip-box"
          role="tooltip"
          aria-hidden="true"
        >
          <div
            className={
              shortcut ? "rte-tooltip-label" : "rte-tooltip-label no-shortcut"
            }
          >
            {label}
          </div>
          {shortcut && <div className="rte-tooltip-shortcut">{shortcut}</div>}
          {!shortcut && <div className="sr-only">{t.noShortcut}</div>}
          <div aria-hidden="true" className="rte-tooltip-caret" />
        </div>
      )}
    </span>
  );
};

export default TooltipWrapper;
