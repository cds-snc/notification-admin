import React, { useContext } from "react";
import { Date } from "../Date/Date";
import { Toggle } from "../Toggle/Toggle";
import { Time } from "../Time/Time";
import { store, I18nContext } from "./index";

export const DateTime = () => {
  const { selected } = useContext(store);
  const { translate } = useContext(I18nContext);

  if (typeof selected[0] === "undefined") {
    return null;
  }

  return (
    <div className="column">
      <div className="selected-date-time-box">
        <div className="triangle"></div>
        <div className="date-time-box">
          <div classNAme="form-group">
            <label className="form-label" for="time">
              <span>
                {translate("select_time_label")} <Date />
              </span>
            </label>
            <span id="time-hint" className="form-hint">
              {translate("select_time_hint")}
            </span>
            <Time name="time" />
          </div>
          <Toggle />
        </div>
      </div>
    </div>
  );
};
