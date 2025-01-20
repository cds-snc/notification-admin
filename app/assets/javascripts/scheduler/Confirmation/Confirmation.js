import React, { useContext } from "react";
import dayjs from "dayjs";
import { store, I18nContext } from "./index";

export const Confirmation = () => {
  const { selected, time, _24hr } = useContext(store);
  const { translate } = useContext(I18nContext);

  // reconstruct date for display:
  const date = selected + "T" + time;

  const timeFormat =
    _24hr === "on"
      ? dayjs(date).format("H [h] mm")
      : dayjs(date).format("h:mm A");

  return selected.length > 0 && time ? (
    <div className="confirmation set">
      <i
        aria-hidden="true"
        class="confirmationIcon fa-xl fa-solid fa-paper-plane"
      ></i>

      <div className="confirmationMessage">
        <p>{translate("message_will_be_sent")}</p>
        <p className="confirmationTime">
          <time datetime={date}>
            {translate("date_prefix")}
            {dayjs(date).format(translate("date_format"))} {translate("at")}{" "}
            {timeFormat}, {translate("local_time_suffix")}
          </time>
        </p>
        <p>{translate("cancel")}</p>
      </div>
    </div>
  ) : (
    <div className="confirmation unset">
      <p>{translate("no_time_selected")}</p>
    </div>
  );
};
