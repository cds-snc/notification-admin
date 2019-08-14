import Polyglot from "node-polyglot";
import Moment from "moment";
window.moment = Moment;
window.polyglot = new Polyglot({ phrases: APP_PHRASES , locale: APP_LANG });