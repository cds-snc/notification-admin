import React, { useContext } from "react";
import { store } from "./index";

export const Toggle = () => {
  const { _24hr, time, dispatch } = useContext(store);

  if (time === "") {
    return <div className="choice choice--radios"></div>;
  }

  return (
    <div className="choice choice--radios">
      <div className="choice__item">
        <input
          name="time-toggle"
          type="radio"
          id="am_pm"
          value="am_pm"
          onChange={() => {
            dispatch({ type: "AM_PM", payload: "off" });
          }}
          checked={_24hr === "off" ? true : false}
        />
        <label htmlFor="am_pm">am/pm</label>
      </div>

      <div className="choice__item">
        <input
          name="time-toggle"
          type="radio"
          id="_24"
          value="_24"
          onChange={() => {
            dispatch({ type: "AM_PM", payload: "on" });
          }}
          checked={_24hr === "on" ? true : false}
        />
        <label htmlFor="_24">24h</label>
      </div>
    </div>
  );
};
