import type { CrossmintProtectedInputProps } from "@/types/protected-input/CrossmintProtectedInputProps";
import { protectedInputIncomingEvents, protectedInputOutgoingEvents } from "@/types/protected-input/events";
import { appendObjectToQueryParams } from "@/utils/appendObjectToQueryParams";
import { IFrameWindow } from "@crossmint/client-sdk-window";
import type { CrossmintApiClient } from "@crossmint/common-sdk-base";

export type ProtectedInputServiceProps = {
    apiClient: CrossmintApiClient;
};

export function createProtectedInputService({ apiClient }: ProtectedInputServiceProps) {
    function getIFrameUrl(props: CrossmintProtectedInputProps) {
        const urlWithPath = apiClient.buildUrl("/sdk/unstable/protected-input");
        const queryParams = new URLSearchParams();

        // Only the params of the hosted page contract, picked by name, so an extra key on the
        // props object (or a future prop) never reaches the URL. Objects (appearance) are
        // JSON-encoded; plain strings are sent as-is; unset values are skipped. The page
        // validates them and posts `protected-input:error` with `invalid_params` if it rejects
        // any, and posts its events to the embedding page's origin (its referrer).
        const { jwt, merchantUrl, expiresAt, label, appearance } = props;
        appendObjectToQueryParams(queryParams, { merchantUrl, expiresAt, label, appearance });

        queryParams.append("jwt", jwt);
        queryParams.append("apiKey", apiClient.crossmint.apiKey);
        queryParams.append("sdkMetadata", JSON.stringify(apiClient["internalConfig"].sdkMetadata));

        return `${urlWithPath}?${queryParams.toString()}`;
    }

    // No explicit targetOrigin: IFrameWindow derives it from the iframe src, so only messages
    // from the Crossmint origin that served the page are accepted.
    function createIframeClient(iframe: HTMLIFrameElement) {
        return IFrameWindow.initExistingIFrame(iframe, {
            incomingEvents: protectedInputIncomingEvents,
            outgoingEvents: protectedInputOutgoingEvents,
        });
    }

    return {
        iframe: {
            getUrl: getIFrameUrl,
            createClient: createIframeClient,
        },
    };
}
