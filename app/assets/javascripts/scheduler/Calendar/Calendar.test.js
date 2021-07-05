import React from "react";
import dayjs from "dayjs";
import { StateProvider, setIntialState } from "../store";
import { I18nProvider, getTranslate } from "../i18n";
import { Calendar } from "./Calendar";
import { render, fireEvent, wait } from "@testing-library/react";
import "@testing-library/jest-dom/extend-expect";

describe("Calendar", function () {
  // setup
  const i18nState = {
    langCode: "en",
    translate: getTranslate("en"),
  };

  const today = dayjs("2020-02-28");
  const firstDay = dayjs("2020-02-29");
  const providerState = setIntialState({ today, firstDay });

  // tests
  test("Renders a calendar", async () => {
    const { getByLabelText, container, debug } = render(
      <I18nProvider value={i18nState}>
        <StateProvider value={providerState}>
          <Calendar />
        </StateProvider>
      </I18nProvider>
    );

    //debug();

    // has previous and next buttons
    expect(getByLabelText("Previous month")).toHaveTextContent("❮");
    expect(getByLabelText("Next month")).toHaveTextContent("❯");

    // shows days of the week
    expect(getByLabelText("Wednesday")).toHaveTextContent("We");

    // shows month name for the date provided
    expect(container.querySelector(`.Nav--month`)).toHaveTextContent(
      "February"
    );

    // renders a day
    expect(container.querySelector(`[data-day="29"]`)).toHaveTextContent("29");

    // marks day before first day as Unavailable
    const label = container
      .querySelector(`[data-day="28"]`)
      .getAttribute("aria-label");

    expect(label).toEqual("Unavailable, Friday February 28 2020");
  });

  test("Handles key nav events", async () => {
    const { container, getByLabelText } = render(
      <I18nProvider value={i18nState}>
        <StateProvider value={providerState}>
          <Calendar />
        </StateProvider>
      </I18nProvider>
    );

    fireEvent.keyDown(document.activeElement, {
      key: "ArrowLeft",
      code: 37,
    });

    await wait(() => expect(document.activeElement).toHaveTextContent("28"));

    fireEvent.keyDown(document.activeElement, {
      key: "ArrowUp",
      code: 38,
    });

    await wait(() => expect(document.activeElement).toHaveTextContent("21"));

    fireEvent.keyDown(document.activeElement, {
      key: "ArrowDown",
      code: 40,
    });

    await wait(() => expect(document.activeElement).toHaveTextContent("28"));

    fireEvent.keyDown(document.activeElement, {
      key: "ArrowRight",
      code: 39,
    });

    await wait(() => expect(document.activeElement).toHaveTextContent("29"));

    fireEvent.keyDown(document.activeElement, {
      key: "ArrowRight",
      code: 39,
    });

    await wait(() => expect(document.activeElement).toHaveTextContent("1"));

    // should navigate into the next month
    expect(container.querySelector(`.Nav--month`)).toHaveTextContent("March");
  });
});
