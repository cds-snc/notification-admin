import React, { useEffect, useState, useContext } from "react";
import { store, I18nContext } from "./index";

export const Announce = () => {
  const { updateMessage } = useContext(store);
  const { translate } = useContext(I18nContext);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setMessage(updateMessage);
    }, 1000);
    return () => clearTimeout(timer);
  }, [updateMessage]);

  return (
    <span
      id="Calendar-updates"
      className="visually-hidden"
      aria-live="assertive"
    >
      {translate(message)}
    </span>
  );
};
