import React, { createContext, useReducer } from "react";
import dayjs from "dayjs";
import "dayjs/locale/fr-ca";
import {
  isBlockedDay,
  setSelected,
  parseDay,
  getFirstDay,
  getLastDay,
  getNextDay,
  yearMonthDay
} from "./Calendar/index";

const LANGUAGES = ["en", "fr-ca"]; // en

let params = new URL(document.location).searchParams;
let langQuery = params.get("lang");
let LOCALE = LANGUAGES[0];
if (langQuery === "fr") {
  LOCALE = LANGUAGES[1];
}

if (typeof APP_LANG !== "undefined" && APP_LANG === "fr") {
  LOCALE = LANGUAGES[1];
}

if (typeof APP_LANG !== "undefined" && APP_LANG === "en") {
  LOCALE = LANGUAGES[0];
}

dayjs.locale(LOCALE); // global

const defaultToday = dayjs()
  .set("hour", 0)
  .set("minute", 0)
  .set("second", 0)
  .set("millisecond", 0);

const defautFirstDay = dayjs(defaultToday);
// Note: date = YYYY-MM-DD on the calendar display not the current date
// date - updates on prev / next month click

export const setIntialState = (
  data = {
    today: defaultToday,
    firstDay: defautFirstDay
  }
) => {
  const { today, firstDay } = data;

  return {
    today,
    firstAvailableDate: firstDay,
    lastAvailableDate: dayjs(firstDay).add(1, "month"),
    date: yearMonthDay(firstDay),
    time: "",
    selected: [yearMonthDay(firstDay)],
    focusedDayNum: dayjs(firstDay).format("D"),
    updateMessage: "",
    _24hr: LOCALE === "en" ? "off" : "on"
  };
};

const initialState = setIntialState();

export const store = createContext(initialState);

const { Provider } = store;

export const StateProvider = ({ value, children }) => {
  const mergedState = { ...initialState, ...value };

  const [state, dispatch] = useReducer((state, action) => {
    let newState = {};
    switch (action.type) {
      case "AM_PM":
        newState = {
          ...state,
          _24hr: action.payload,
          updateMessage:
            action.payload === "off"
              ? "24 hr time selected"
              : "AM PM time selected "
        };
        break;
      case "CALENDAR_UPDATES":
        newState = { ...state, updateMessage: action.payload };
        break;
      case "SELECT_TIME":
        newState = { ...state, time: action.payload };
        break;
      case "SELECT_DATE":
        if (isBlockedDay(dayjs(action.payload), state)) {
          newState = { ...state };
        } else {
          newState = {
            ...state,
            selected: setSelected(state.selected, action.payload),
            focusedDayNum: parseDay(action.payload),
            time: "" // reset time value
          };
        }
        break;
      case "SELECT_NEXT":
        newState = {
          ...state,
          date: yearMonthDay(dayjs(state.date).add(1, "month"))
        };
        break;
      case "SELECT_PREVIOUS":
        newState = {
          ...state,
          date: yearMonthDay(dayjs(state.date).subtract(1, "month"))
        };
        break;
      case "FOCUS_DAY":
        newState = {
          ...state,
          focusedDayNum: action.payload.focused
        };
        break;
      case "KEY_UP":
        newState = {
          ...state,
          ...getNextDay(Number(state.focusedDayNum) - 7, state, "up")
        };
        break;
      case "KEY_DOWN":
        newState = {
          ...state,
          ...getNextDay(Number(state.focusedDayNum) + 7, state, "down")
        };
        break;
      case "KEY_RIGHT":
        newState = {
          ...state,
          ...getNextDay(Number(state.focusedDayNum) + 1, state, "right")
        };
        break;
      case "KEY_LEFT":
        newState = {
          ...state,
          ...getNextDay(Number(state.focusedDayNum) - 1, state, "left")
        };
        break;
      default:
        newState = state;
    }

    newState.firstDay = getFirstDay(newState.date);
    newState.lastDay = getLastDay(newState.date);

    return newState;
  }, mergedState);

  return <Provider value={{ ...state, dispatch }}>{children}</Provider>;
};
