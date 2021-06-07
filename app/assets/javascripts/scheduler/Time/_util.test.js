import {
  populateTimes,
  dateIsToday,
  timeValuesToday,
  getStartTime,
} from "./_util";
import dayjs from "dayjs";

const state = {
  today: "2020-01-01",
  selected: ["2020-01-01"],
  time_values: [
    { val: "1:00", label: "1:00 AM" },
    { val: "9:00", label: "9:00 AM" },
    { val: "13:00", label: "1:00 PM" },
    { val: "14:00", label: "2:00 PM" },
    { val: "15:00", label: "3:00 PM" },
    { val: "16:00", label: "4:00 PM" },
  ],
};

describe("Time utils", function () {
  const dayjsToday = dayjs()
    .set("hour", 0)
    .set("minute", 0)
    .set("second", 0)
    .set("millisecond", 0);

  const constructedToday =
    dayjsToday.year() +
    "-" +
    (dayjsToday.month() + 1) +
    "-" +
    dayjsToday.date();

  test("getStartTime correctly returns midnight for a day that is not today", async () => {
    expect(getStartTime(state.today)).toBe(0); // midnight
  });

  test("getStartTime does not return midnight when the day is today", async () => {
    expect(getStartTime(dayjsToday)).not.toBe(0);
  });

  test("Populate Times shows all 24h for a future date", async () => {
    expect(populateTimes(false, ["2050-01-01"])).toHaveLength(24);
  });

  test("dateIsToday returns true when evaluating today", async () => {
    expect(dateIsToday([dayjsToday])).toBeTruthy;
  });

  test("dateIsToday returns false when evaluating a different day", async () => {
    expect(dateIsToday(state.selected)).toBeFalsy;
  });

  test("timeValuesToday culls times that have already passed", async () => {
    // this test will fail between midnight and 1 AM
    const culled_time_values = timeValuesToday(
      constructedToday,
      state.time_values
    );
    expect(culled_time_values).not.toHaveLength(6);
  });
});
