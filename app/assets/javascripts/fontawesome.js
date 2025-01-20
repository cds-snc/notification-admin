/**
 * This file loads in font awesome for use in Notify
 * We only load the icons we use to keep the bundle size down. To add an icon:
 * - import if from @fortawesome/free-solid-svg-icons
 * - include it in the library.add call
 */
import { config } from "@fortawesome/fontawesome-svg-core";
import { library, dom } from "@fortawesome/fontawesome-svg-core";
import { faCheck } from "@fortawesome/free-solid-svg-icons/faCheck";
import { faArrowUpRightFromSquare } from "@fortawesome/free-solid-svg-icons/faArrowUpRightFromSquare";
import { faPlus } from "@fortawesome/free-solid-svg-icons/faPlus";
import { faArrowRight } from "@fortawesome/free-solid-svg-icons/faArrowRight";
import { faArrowLeft } from "@fortawesome/free-solid-svg-icons/faArrowLeft";
import { faAngleDown } from "@fortawesome/free-solid-svg-icons/faAngleDown";
import { faCircleQuestion } from "@fortawesome/free-solid-svg-icons/faCircleQuestion";
import { faTriangleExclamation } from "@fortawesome/free-solid-svg-icons/faTriangleExclamation";
import { faCircleExclamation } from "@fortawesome/free-solid-svg-icons/faCircleExclamation";
import { faCircleCheck } from "@fortawesome/free-solid-svg-icons/faCircleCheck";
import { faInfoCircle } from "@fortawesome/free-solid-svg-icons";
import { faPaperPlane } from "@fortawesome/free-solid-svg-icons";
import { faXmark } from "@fortawesome/free-solid-svg-icons/faXMark";
import { faTag } from "@fortawesome/free-solid-svg-icons/faTag";

let FontAwesomeIconLoader = () => {
  config.autoAddCss = false;
  library.add([
    faCheck,
    faArrowUpRightFromSquare,
    faPlus,
    faArrowRight,
    faArrowLeft,
    faAngleDown,
    faCircleQuestion,
    faTriangleExclamation,
    faCircleExclamation,
    faCircleCheck,
    faInfoCircle,
    faPaperPlane,
    faXmark,
    faTag,
  ]);
  dom.watch();
};

export default FontAwesomeIconLoader;
