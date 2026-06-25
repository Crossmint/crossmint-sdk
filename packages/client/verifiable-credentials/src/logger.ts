import {
    SdkLogger,
    validateAPIKey,
    detectPlatform,
    BrowserDatadogSink,
    ServerDatadogSink,
} from "@crossmint/common-sdk-base";

export const credentialsLogger = new SdkLogger();

export function initCredentialsLogger(apiKey: string): void {
    const validationResult = validateAPIKey(apiKey);
    if (!validationResult.isValid) {
        return;
    }
    const { environment, projectId } = validationResult;
    credentialsLogger.init({
        packageName: "@crossmint/client-sdk-verifiable-credentials",
        environment,
        projectId,
    });

    const platform = detectPlatform();
    if (platform === "browser") {
        const sink = new BrowserDatadogSink(environment);
        credentialsLogger.addSink(sink);
    } else if (platform === "server") {
        const sink = new ServerDatadogSink(environment);
        credentialsLogger.addSink(sink);
    }
}
