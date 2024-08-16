import { isClient, isLocalhost } from "../../utils";
import { ConsoleProvider } from "./ConsoleProvider";
import { DatadogProvider } from "./DatadogProvider";

export type BrowserLogger = ConsoleProvider | DatadogProvider;

function getBrowserLogger(service: string) {
    if (isClient() && isLocalhost()) {
        return new ConsoleProvider();
    }

    return new DatadogProvider(service);
}

export { getBrowserLogger };
