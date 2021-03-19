import Polyglot from "node-polyglot";
//REVIEW: The app already has dayjs dep which is supposed to be a lightweight momentjs replacement. --jlr
import Moment from "moment";
import { DiffDOM } from "diff-dom";
import Swal from "sweetalert2";

if (!window.APP_PHRASES || typeof APP_PHRASES === "undefined") {
  window.APP_PHRASES = {
    now: "Now"
  };
}

if (!window.APP_LANG || typeof APP_LANG === "undefined") {
  window.APP_LANG = "en";
}

window.moment = Moment;
window.DiffDOM = DiffDOM;

window.polyglot = new Polyglot({ phrases: APP_PHRASES || {}, locale: APP_LANG });
window.Swal = Swal;

let nowLabel = "Now Label";

if (window.polyglot.t) {
  nowLabel = window.polyglot.t("now");
}

window.swapSendButtonText = function() {
  // swap between 'Send Now' and 'Schedule' text on calendar page based on whether
  // schedule feature is being used or not
  if (document.getElementById("submit-button").innerHTML === window.polyglot.t("send_now")) {
    document.getElementById("submit-button").innerHTML = window.polyglot.t("send_later");
  } else {
    document.getElementById("submit-button").innerHTML = window.polyglot.t("send_now");
  }
}
