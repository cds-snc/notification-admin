import React from "react";
import { Icon } from "lucide-react";
import { englishBlockIcon, frenchBlockIcon, rightToLeftIcon } from "../icons";
const MultipleLanguagesInfoPane = ({ t, isActive }) => {
  const pane = t.infoPane2;

  return (
    <section
      id="multiple-languages"
      aria-labelledby="multiple-languages-title"
      hidden={!isActive}
    >
      <p>{pane.p1}</p>
      <ul className="list list-bullet ml-10">
        <li>
          {pane.li1}{" "}
          <Icon iconNode={englishBlockIcon} aria-label={pane.li1Icon1} />{" "}
          {pane.li1or}{" "}
          <Icon iconNode={frenchBlockIcon} aria-label={pane.li1Icon2} />
        </li>
        <li>
          {pane.li2}{" "}
          <Icon iconNode={rightToLeftIcon} aria-label={pane.li2Icon} />
        </li>
      </ul>
    </section>
  );
};

export default MultipleLanguagesInfoPane;
