import {
    SdkLogger,
    validateAPIKey,
    detectPlatform,
    BrowserDatadogSink,
    ServerDatadogSink,
} from "@crossmint/common-sdk-base";

export const reactUiLogger = new SdkLogger();

export function initReactUiLogger(apiKey: string): void {
    const validationResult = validateAPIKey(apiKey);
    if (!validationResult.isValid) {
        return;
    }
    const { environment, projectId } = validationResult;
    reactUiLogger.init({
        packageName: "@crossmint/client-sdk-react-ui",
        environment,
        projectId,
    });

    const platform = detectPlatform();
    if (platform === "browser") {
        const sink = new BrowserDatadogSink(environment);
        reactUiLogger.addSink(sink);
    } else if (platform === "server") {
        const sink = new ServerDatadogSink(environment);
        reactUiLogger.addSink(sink);
    }
}
