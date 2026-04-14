import React, { useState, useRef, useEffect } from "react";
import { useEditorContext } from "./EditorContext";
import { getNoShortcutLabel } from "./localization";
import "./tooltip.compiled.css";

const TooltipWrapper = ({ children, label, shortcut }) => {
  const [isVisible, setIsVisible] = useState(false);
  const { lang } = useEditorContext();
  const tooltipRef = useRef(null);
  const targetRef = useRef(null);

  const showTooltip = () => setIsVisible(true);
  const hideTooltip = () => setIsVisible(false);

  // When focusing or hovering the target, prepare it with a screen-reader
  // announcement that combines the button's label and its keyboard shortcut.
  // This ensures accessibility parity with visual users who see the shortcut
  // in the tooltip. Use " (No shortcut)" for accessible clarity when none is set.
  const fullLabel = shortcut
    ? `${label} (${shortcut})`
    : `${label} (${getNoShortcutLabel(lang)})`;

  return (
    <span
      className="rte-tooltip-wrapper"
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onFocus={showTooltip}
      onBlur={hideTooltip}
      ref={targetRef}
    >
      {React.cloneElement(children, { "aria-label": fullLabel })}
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
          {!shortcut && (
            <div className="sr-only">{getNoShortcutLabel(lang)}</div>
          )}
          <div aria-hidden="true" className="rte-tooltip-caret" />
        </div>
      )}
    </span>
  );
};

export default TooltipWrapper;
