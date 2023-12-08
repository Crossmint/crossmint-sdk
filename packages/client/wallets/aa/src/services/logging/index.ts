
import { isLocalhost } from "@/utils/helpers";
import { ConsoleProvider } from "./ConsoleProvider";
import { DatadogProvider } from "./DatadogProvider";

function getBrowserLogger() {
    if (isLocalhost()) {
        console.log('CONSOLE PROVIDER RETURRRRNED')
        return new ConsoleProvider();
    }

    throw new Error("DatadogProvider not implemented yet");
    return new DatadogProvider();
}

const { logInfo, logWarn, logError } = getBrowserLogger();

export { logInfo, logWarn, logError };
