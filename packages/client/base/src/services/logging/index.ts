import { isClient, isLocalhost } from "../../utils";
import { ConsoleProvider } from "./ConsoleProvider";
import { DatadogProvider } from "./DatadogProvider";

export type BrowserLogger = ConsoleProvider | DatadogProvider;

function getBrowserLogger(service: string, { onlyDatadog }: { onlyDatadog?: boolean } = {}): BrowserLogger {
    if (isClient() && isLocalhost() && !onlyDatadog) {
        return new ConsoleProvider();
    }

    return new DatadogProvider(service);
}

export { getBrowserLogger };
