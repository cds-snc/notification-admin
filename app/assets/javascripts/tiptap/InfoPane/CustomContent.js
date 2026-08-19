import React from "react";
import { Icon } from "lucide-react";
import {
  variableIcon,
  conditionalBlockIcon,
  conditionalInlineIcon,
} from "../icons";

const CustomContentInfoPane = ({ t, isActive }) => {
  const pane = t.infoPane1;

  return (
    <section
      id="custom-content"
      aria-labelledby="custom-content-title"
      hidden={!isActive}
    >
      <h2 id="custom-content-title" className="heading-small mt-0">
        {pane.title}
      </h2>
      <p>
        {pane.p1} <Icon iconNode={variableIcon} title={pane.p1Icon} />
      </p>
      <p>{pane.p2}</p>
      <h3 className="heading-small">{pane.title2}</h3>
      <p>{pane.p3}</p>
      <ul className="list list-bullet ml-10">
        <li>{pane.li1}</li>
        <li>
          {pane.li2}{" "}
          <Icon iconNode={conditionalInlineIcon} title={pane.li2Icon} />
        </li>
        <li>
          {pane.li3}{" "}
          <Icon iconNode={conditionalBlockIcon} title={pane.li3Icon} />
        </li>
      </ul>
    </section>
  );
};

export default CustomContentInfoPane;
