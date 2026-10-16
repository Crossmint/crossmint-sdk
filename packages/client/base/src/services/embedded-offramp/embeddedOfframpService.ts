import type { CrossmintEmbeddedOfframpProps } from "@/types/embedded-offramp/CrossmintEmbeddedOfframpProps";
import { embeddedOfframpIncomingEvents, embeddedOfframpOutgoingEvents } from "@/types/embedded-offramp/events";
import { appendObjectToQueryParams } from "@/utils/appendObjectToQueryParams";
import { IFrameWindow } from "@crossmint/client-sdk-window";
import type { CrossmintApiClient } from "@crossmint/common-sdk-base";

const MAX_SDK_NAME_LENGTH = 64;
const MAX_SDK_VERSION_LENGTH = 32;

export type EmbeddedOfframpServiceProps = {
    apiClient: CrossmintApiClient;
};

export function createEmbeddedOfframpService({ apiClient }: EmbeddedOfframpServiceProps) {
    function getIFrameUrl(props: CrossmintEmbeddedOfframpProps) {
        const urlWithPath = apiClient.buildUrl("/sdk/unstable/embedded-offramp");
        const queryParams = new URLSearchParams();

        // The payer stays in the host app, and appendObjectToQueryParams drops the callbacks.
        const { payer: _payer, ...urlProps } = props;
        appendObjectToQueryParams(queryParams, urlProps);

        const { name, version } = apiClient["internalConfig"].sdkMetadata;
        queryParams.append("apiKey", apiClient.crossmint.apiKey);
        queryParams.append(
            "sdkMetadata",
            JSON.stringify({
                name: name.slice(0, MAX_SDK_NAME_LENGTH),
                version: version.slice(0, MAX_SDK_VERSION_LENGTH),
            })
        );

        return `${urlWithPath}?${queryParams.toString()}`;
    }

    function createIframeClient(iframe: HTMLIFrameElement) {
        return IFrameWindow.initExistingIFrame(iframe, {
            incomingEvents: embeddedOfframpIncomingEvents,
            outgoingEvents: embeddedOfframpOutgoingEvents,
        });
    }

    return {
        iframe: {
            getUrl: getIFrameUrl,
            createClient: createIframeClient,
        },
    };
}
