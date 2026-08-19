import React from "react";

const EmailLinksInfoPane = ({ t, isActive }) => {
  const pane = t.infoPane3;

  return (
    <section id="email-links" aria-label={pane.label} hidden={!isActive}>
      <p>{pane.p1}</p>
      <p>{pane.p2}</p>
      <ol className="list list-number ml-10">
        <li>{pane.li1}</li>
        <li>{pane.li2}</li>
        <li>{pane.li3}</li>
      </ol>
    </section>
  );
};

export default EmailLinksInfoPane;
