import React from "react";
import { RadioButton } from "./RadioButton";
import { Hour } from "./Hour";
import { getCurrentTime } from "./dateUtils";

const disabledIf = today => {
  if (today && getCurrentTime().amPM === "PM") {
    return true;
  }

  return false;
};

export class TimeInputs extends React.Component {
  render() {
    const { hour, amPM, isToday, handleAmPM, handleHour } = this.props;
    
    let AMLabel = 'am'
    let PMLabel = 'pm'

    if (window.polyglot.t) {
      AMLabel = window.polyglot.t(AMLabel);
      PMLabel = window.polyglot.t(PMLabel);
    }
    
    return (
      <div className="time-box">
        <Hour
          isToday={isToday}
          amPM={amPM}
          hour={hour}
          handleClick={handleHour}
        />
        <div className="time-radios">
          <RadioButton
            label={AMLabel}
            id="am-pm-0"
            name="amPM"
            aria-label="AM"
            val={amPM}
            handleClick={handleAmPM}
            disabled={disabledIf(isToday)}
          />

          <RadioButton
            label={PMLabel}
            id="am-pm-1"
            name="amPM"
            aria-label="PM"
            val={amPM}
            handleClick={handleAmPM}
          />
        </div>
      </div>
    );
  }
}
