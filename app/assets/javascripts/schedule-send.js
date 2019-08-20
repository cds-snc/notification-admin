import React from "react";

const RadioButton = ({
  label,
  id,
  name,
  type,
  checked,
  handleClick,
  ...props
}) => {
  return (
    <div className="multiple-choice">
      <input id={id} name={name} type="radio" data-type={type} {...props} />
      <label className="block-label js-block-label" htmlFor={name}>
        {label}
      </label>
    </div>
  );
};


const DayButton = ({ label, handleClick = () => {} }) => {
  return (
    <input
      onClick={handleClick}
      type="button"
      className="js-category-button"
      value={label}
    />
  );
};

class DayButtons extends React.Component {
  render() {
    const { handleClick, currentDayLabel, days } = this.props;
    return (
      <div className="day-select radio-select">
        <div className="radio-select-column">
          {days.map(day => {
            return (
              <DayButton key={day} label={day} handleClick={handleClick} />
            );
          })}
        </div>
      </div>
    );
  }
}

class DoneButton extends React.Component {
  render() {
    const { label, onClick } = this.props;
    return (
      <input type="button" onClick={onClick} className="button" value={label} />
    );
  }
}

class TimeInputs extends React.Component {
  render() {
    const { time, amPM } = this.props;
    return (
      <div className="time-box">
        <div className="hour-choice">
          <input
            defaultValue={time}
            name="hour"
            style={{ width: 50 }}
            type="text"
            className="form-control form-control-1-1 "
          />
          <label htmlFor="hour">O'Clock</label>
        </div>

        <div className="time-radios">
          <RadioButton
            label="AM"
            id="am-pm-0"
            name="am-pm"
            defaultChecked={amPM === "AM" ? true : false}
          />

          <RadioButton
            label="PM"
            id="am-pm-1"
            name="am-pm"
            defaultChecked={amPM === "PM" ? true : false}
          />
        </div>
      </div>
    );
  }
}

export default class ScheduleMessage extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      submitLabel: this.props.submitLabel,
      days: this.props.days,
      currentDayLabel: "now",
      time: this.props.initialHour,
      amPM: this.props.amPM,
      showTimeInputs: false,
      timeStamp: ""
    };
  }

  handleSubmit = e => {
    alert("submit");
  };

  handleDayClick = e => {
    const labelValue = e.target.value;

    this.setState({
      showTimeInputs: labelValue === "Now" ? false : true,
      currentDayLabel: labelValue
    });
  };

  render() {
    const {
      submitLabel,
      showTimeInputs,
      currentDayLabel,
      time,
      amPM,
      days
    } = this.state;
    return (
      <form>
        <DayButtons
          days={days}
          currentDayLabel={currentDayLabel}
          handleClick={this.handleDayClick}
        />
        {showTimeInputs && <TimeInputs time={time} amPM={amPM} />}
        <DoneButton label={submitLabel} onClick={this.handleSubmit} />
      </form>
    );
  }
}