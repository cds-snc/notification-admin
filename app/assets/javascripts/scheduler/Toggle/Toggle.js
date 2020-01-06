import React, { useContext, useState } from "react";
import { store } from "./index";
import "./style.css";

export const Toggle = () => {
  const { _24hr, dispatch } = useContext(store);
  const [active, setActive] = useState(false);

  return (
    <div
      className={
        active ? "toggle-holder toggle-holder-active" : "toggle-holder"
      }
    >
      <div
        className={[
          "toggle-label",
          _24hr === "off" ? "toggle-label-active" : ""
        ].join(" ")}
      >
        am/pm
      </div>
      <button
        className={`switch ${_24hr}`}
        aria-label="AM PM 24hr time toggle"
        onFocus={() => {
          setActive(true);
        }}
        onBlur={() => {
          setActive(false);
        }}
        onClick={() => {
          dispatch({ type: "AM_PM", payload: _24hr });
        }}
      />
      <div
        className={[
          "toggle-label",
          _24hr === "on" ? "toggle-label-active" : ""
        ].join(" ")}
      >
        24h
      </div>
    </div>
  );
};
