import React, { useContext } from "react";
import dayjs from "dayjs";
import { store, I18nContext } from "./index";

export const Confirmation = () => {
  const { selected, time } = useContext(store);
  const { translate } = useContext(I18nContext);

  // reconstruct date for display:
  const date = selected + "T" + time;

  return (selected && time) ? (
    <div className="confirmation set">
      <p>{translate("message_will_be_sent")}</p>
      <p><strong>{translate("date_prefix")}{dayjs(date).format(translate("date_format"))} {translate("at")} {dayjs(date).format(translate("time_format"))}</strong></p>
    </div>
  ) : (
    <div className="confirmation unset">
      <p>{translate("no_time_selected")}</p>
    </div>
  );
};
