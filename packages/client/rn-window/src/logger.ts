import {
    SdkLogger,
    validateAPIKey,
    detectPlatform,
    BrowserDatadogSink,
    ServerDatadogSink,
} from "@crossmint/common-sdk-base";

export const rnWindowLogger = new SdkLogger();

export function initRnWindowLogger(apiKey: string): void {
    const validationResult = validateAPIKey(apiKey);
    if (!validationResult.isValid) {
        return;
    }
    const { environment, projectId } = validationResult;
    rnWindowLogger.init({
        packageName: "@crossmint/client-sdk-rn-window",
        environment,
        projectId,
    });

    const platform = detectPlatform();
    if (platform === "browser") {
        const sink = new BrowserDatadogSink(environment);
        rnWindowLogger.addSink(sink);
    } else if (platform === "server") {
        const sink = new ServerDatadogSink(environment);
        rnWindowLogger.addSink(sink);
    }
}
