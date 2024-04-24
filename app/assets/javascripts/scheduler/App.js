import React, { useContext } from "react";
import { StateProvider, setIntialState, defaultState } from "./store";
import { I18nProvider, I18nContext } from "./i18n";
import { ErrorMessage } from "./ErrorMessage/ErrorMessage";
import { Calendar } from "./Calendar/Calendar";
import { DateTime } from "./DateTime/DateTime";
import { SetDateTime } from "./SetDateTime/SetDateTime";
import { Confirmation } from "./Confirmation/Confirmation";
import { DomEventHandler } from "./DomEventHandler/DomEventHandler";
import dayjs from "dayjs";
import "./style.css";

export const App = () => {
  let options = {};
  const { translate } = useContext(I18nContext);

  options = { init: setIntialState, ...window.schedulerOptions };

  const providerState = options.init({
    dayjs,
    defaultState: defaultState(),
  });

  return (
    <I18nProvider>
      <StateProvider value={providerState}>
        <DomEventHandler />
        <ErrorMessage />
        <p className="messageTextStyle">{translate("select_date")}</p>
        <div className="schedule">
          <div>
            <Calendar />
          </div>
          <DateTime />
          <SetDateTime />
        </div>
        <div className="confirmationWrapper messageTextStyle">
          <Confirmation />
        </div>
      </StateProvider>
    </I18nProvider>
  );
};
