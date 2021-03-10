import React, { createContext, useReducer } from "react";
import { populateTimes, dateIsToday, timeValuesToday } from "./Time/_util";
import dayjs from "dayjs";
import "dayjs/locale/fr-ca";
import {
  setSelected,
  parseDay,
  getFirstDay,
  getLastDay,
  getNextDay,
  yearMonthDay,
  getFirstAvailableDay
} from "./Calendar/index";

const LANGUAGES = ["en", "fr-ca"]; // en
const LOCALE = window.APP_LANG === "en" ? LANGUAGES[0] : LANGUAGES[1];

dayjs.locale(LOCALE); // global

const defaultToday = dayjs()
  .set("hour", 0)
  .set("minute", 0)
  .set("second", 0)
  .set("millisecond", 0);

const defautFirstDay = dayjs(defaultToday);
// Note: date = YYYY-MM-DD on the calendar display not the current date
// date - updates on prev / next month click

export const defaultState = (
  data = {
    today: defaultToday,
    firstDay: defautFirstDay
  }
) => {
  const { today, firstDay } = data.defaultState ? data.defaultState: data;

  let lastAvailableDate;
  lastAvailableDate = dayjs(firstDay).add(96, "hour");

  const blockedDay = day => {
    const beforeFirstDay = firstDay ? dayjs(day).isBefore(firstDay) : false;
    return (
      today > day ||
      beforeFirstDay ||
      dayjs(day).isAfter(lastAvailableDate)
    );
  };

  const time_values = populateTimes(LOCALE === "en" ? "off" : "on");

  return {
    today,
    firstAvailableDate: firstDay,
    lastAvailableDate: lastAvailableDate,
    date: yearMonthDay(firstDay),
    selected: [yearMonthDay(firstDay)],
    focusedDayNum: dayjs(firstDay).format("D"),
    updateMessage: "",
    _24hr: LOCALE === "en" ? "off" : "on",
    errors: "",
    // REVIEW: Raises error past 23h00m in a day, not great when debugging late.
    time: dateIsToday([yearMonthDay(firstDay)]) ? timeValuesToday([yearMonthDay(firstDay)], time_values)[0].val : time_values[0].val,
    time_values: time_values,
    isBlockedDay: blockedDay
  };
};

let options = {};

options = { setIntialState: defaultState, ...window.schedulerOptions };

const initialState = options.setIntialState();

export const setIntialState = options.setIntialState;

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
          time_values: populateTimes(action.payload),
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
      case "TIME_VALUES":
        //time_values = populateTimes(action.payload)
        newState = { ...state, time_values: action.payload };
        break;
      case "SELECT_DATE":
        if (state.isBlockedDay(dayjs(action.payload))) {
          newState = { ...state };
        } else {
          let newTime = dateIsToday([action.payload]) ? timeValuesToday([action.payload], state.time_values)[0].val : state.time;
          newState = {
            ...state,
            selected: setSelected(state.selected, action.payload),
            focusedDayNum: parseDay(action.payload),
            time: newTime
          };

          newState.errors = "";
          /*
          if (
            newState.selected.length === 0
          ) {
            // show deselect error
            newState.errors = [
              {
                id: "1",
                text: "Date must be selected",
                target: "Calendar-dates"
              }
            ];
          }*/
        }
        break;
      case "SELECT_NEXT":
        const nextNewDate = yearMonthDay(dayjs(state.date).add(1, "month"));
        newState = {
          ...state,
          date: nextNewDate,
          focusedDayNum: getFirstAvailableDay(nextNewDate, state)
        };
        break;
      case "SELECT_PREVIOUS":
        const previousNewDate = yearMonthDay(
          dayjs(state.date).subtract(1, "month")
        );
        newState = {
          ...state,
          date: previousNewDate,
          focusedDayNum: getFirstAvailableDay(previousNewDate, state)
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
