import { useEffect, useContext } from "react";
import { store } from "./index";

const useBuildEvent = () => {
  const { dispatch } = useContext(store);

  useEffect(() => {
    const handler = (data) => {
      console.log("custom event called", data.detail);
      dispatch(data.detail);
    };
    window.addEventListener("build", handler);
    return () => {
      window.removeEventListener("build", handler);
    };
  }, []);

  return null;
};

export const DomEventHandler = () => {
  useBuildEvent();
  return null;
};
