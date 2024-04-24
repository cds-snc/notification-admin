import React, { useContext } from "react";
import { store } from "./index";

const ErrorItem = ({ text, target }) => {
  return (
    <li className="error-list__list-item">
      <a className="error-list__link" href={`#${target}`}>
        {text}
      </a>
    </li>
  );
};

export const ErrorMessage = () => {
  const { errors } = useContext(store);
  if (!errors || errors.length > 1) {
    return null;
  }

  return (
    <div className="error-list" role="alert">
      <h3 className="error-list__header">
        Please correct the errors on the page
      </h3>
      <ol className="error-list__list" id="formErrors">
        {errors.map((item) => {
          return (
            <ErrorItem key={item.id} text={item.text} target={item.target} />
          );
        })}
      </ol>
    </div>
  );
};
