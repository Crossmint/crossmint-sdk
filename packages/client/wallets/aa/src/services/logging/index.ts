import { isLocalhost } from "@/utils/helpers";

import { ConsoleProvider } from "./ConsoleProvider";
import { DatadogProvider } from "./DatadogProvider";

function getBrowserLogger() {
    try {
        if (isLocalhost()) {
            return new ConsoleProvider();
        }
        return new DatadogProvider();
    } catch (e) {
        //Control 'window not defined' error when using Datadog. 
        return new ConsoleProvider();
    }
    
}

const { logInfo, logWarn, logError } = getBrowserLogger();

export { logInfo, logWarn, logError };
