import React from "react";
import { StateProvider, setIntialState } from "./store";
import { I18nProvider } from "./i18n";
import { Calendar } from "./Calendar/Calendar";
import { Date } from "./Date/Date";
import { Toggle } from "./Toggle/Toggle";
import { Time } from "./Time/Time";
import { SetDateTime } from "./SetDateTime/SetDateTime";
import "./style.css";

export const App = () => {
  const providerState = setIntialState();
  return (
    <I18nProvider>
      <StateProvider value={providerState}>
        <div className="schedule">
          <div>
            <Calendar />
          </div>
          <div className="column">
            <div className="selected-date-time-box">
              <div className="triangle"></div>
              <div className="date-time-box">
                <Date />
                <Time name="time" />
                <Toggle />
              </div>
            </div>
          </div>
          <SetDateTime />
        </div>
      </StateProvider>
    </I18nProvider>
  );
};
