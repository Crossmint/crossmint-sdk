
import { ConsoleProvider } from "./ConsoleProvider";

function getBrowserLogger() {
    return new ConsoleProvider();
}

const { logInfo, logWarn, logError } = getBrowserLogger();

export { logInfo, logWarn, logError };
