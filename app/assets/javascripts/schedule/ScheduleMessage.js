import React from "react";
import {
  getDateFromString,
  getCurrentTime,
  todayIsSelected,
  isInPast
} from "./dateUtils";
import { DayButtons } from "./DayButtons";
import { TimeInputs } from "./TimeInputs";

export class ScheduleMessage extends React.Component {
  state = {
    currentDayLabel: "Now",
    showTimeInputs: false,
    currentDate: this.props.days[0]["date"],
    hour: getCurrentTime().hour,
    amPM: getCurrentTime().amPM
  };

  componentDidMount() {
    this.handleChange();
  }

  setFieldValue = val => {
    const ref = document.getElementById("scheduled_for");
    if (ref) {
      ref.setAttribute("value", val);
    }
  };

  handleHour = val => {
    this.setState({ hour: val }, () => {
      this.handleChange();
    });
  };

  handleAmPM = val => {
    const { currentDate, hour } = this.state;

    const past = isInPast({ currentDate, hour, val });

    if (!past) {
      this.setState({ amPM: val }, this.handleChange());
      return;
    }

    this.setState(
      { hour: getCurrentTime().hour, amPM: getCurrentTime().amPM },
      this.handleChange()
    );
  };

  handleDayClick = e => {
    const labelValue = e.target.value;
    const date = e.target.dataset.date;
    const { amPM, hour } = this.state;
    this.setState(
      {
        showTimeInputs: labelValue === "Now" ? false : true,
        currentDayLabel: labelValue,
        currentDate: date,
        hour: todayIsSelected(labelValue) ? getCurrentTime().hour : hour,
        amPM: todayIsSelected(labelValue) ? getCurrentTime().amPM : amPM
      },
      () => {
        this.handleChange();
      }
    );
  };

  handleChange = () => {
    try {
      const { currentDate, showTimeInputs } = this.state;
      const current = getCurrentTime();
      let hour = current.hour;
      let amPM = current.amPM;
      if (showTimeInputs) {
        hour = document.querySelector("input[name=hour]").value;
        amPM = document.querySelector("input[name=amPM]:checked").value;
        this.setFieldValue(getDateFromString({ currentDate, hour, amPM }));
      } else {
        // default to "now"
        this.setFieldValue("");
      }
    } catch (e) {
      console.log(e);
    }
  };

  render() {
    const { days } = this.props;
    const { currentDayLabel, showTimeInputs, amPM, hour } = this.state;
    const style = showTimeInputs ? { display: "block" } : { display: "none" };
    return (
      <React.Fragment>
        <DayButtons
          days={days}
          currentDayLabel={currentDayLabel}
          handleClick={this.handleDayClick}
        />
        <div style={style}>
          <TimeInputs
            handleHour={this.handleHour}
            handleAmPM={this.handleAmPM}
            isToday={todayIsSelected(currentDayLabel)}
            hour={hour}
            amPM={amPM}
          />
        </div>
      </React.Fragment>
    );
  }
}
