import {
    SdkLogger,
    validateAPIKey,
    detectPlatform,
    BrowserDatadogSink,
    ServerDatadogSink,
} from "@crossmint/common-sdk-base";

export const authLogger = new SdkLogger();

export function initAuthLogger(apiKey: string): void {
    const validationResult = validateAPIKey(apiKey);
    if (!validationResult.isValid) {
        return;
    }
    const { environment, projectId } = validationResult;
    authLogger.init({
        packageName: "@crossmint/client-sdk-auth",
        environment,
        projectId,
    });

    const platform = detectPlatform();
    if (platform === "browser") {
        const sink = new BrowserDatadogSink(environment);
        authLogger.addSink(sink);
    } else if (platform === "server") {
        const sink = new ServerDatadogSink(environment);
        authLogger.addSink(sink);
    }
}
