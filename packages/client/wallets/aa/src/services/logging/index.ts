import { isLocalhost } from "@/utils/helpers";

import { ConsoleProvider } from "./ConsoleProvider";
import { DatadogProvider } from "./DatadogProvider";

function getBrowserLogger() {
    return new ConsoleProvider();
    // if (isLocalhost()) {
    //     return new ConsoleProvider();
    // }

    // return new DatadogProvider();
}

const { logInfo, logWarn, logError } = getBrowserLogger();

export { logInfo, logWarn, logError };
