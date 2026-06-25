import {
    SdkLogger,
    validateAPIKey,
    detectPlatform,
    BrowserDatadogSink,
    ServerDatadogSink,
} from "@crossmint/common-sdk-base";

export const windowLogger = new SdkLogger();

export function initWindowLogger(apiKey: string): void {
    const validationResult = validateAPIKey(apiKey);
    if (!validationResult.isValid) {
        return;
    }
    const { environment, projectId } = validationResult;
    windowLogger.init({
        packageName: "@crossmint/client-sdk-window",
        environment,
        projectId,
    });

    const platform = detectPlatform();
    if (platform === "browser") {
        const sink = new BrowserDatadogSink(environment);
        windowLogger.addSink(sink);
    } else if (platform === "server") {
        const sink = new ServerDatadogSink(environment);
        windowLogger.addSink(sink);
    }
}
