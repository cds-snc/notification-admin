import React from "react";
export const RadioButton = ({
  label,
  id,
  name,
  type,
  checked,
  handleClick,
  val,
  ...props
}) => {
  return (
    <div className="multiple-choice">
      <input
        value={label}
        id={id}
        name={name}
        type="radio"
        data-type={type}
        onChange={e => {
          const val = e.target.value;
          handleClick(val);
        }}
        checked={val === label}
        {...props}
      />
      <label className="block-label js-block-label" htmlFor={name}>
        {label}
      </label>
    </div>
  );
};
