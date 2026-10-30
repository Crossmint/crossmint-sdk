import type { CrossmintCvcRecollectionProps } from "@/types/cvc-recollection/CrossmintCvcRecollectionProps";
import { cvcRecollectionIncomingEvents, cvcRecollectionOutgoingEvents } from "@/types/cvc-recollection/events";
import { appendObjectToQueryParams } from "@/utils/appendObjectToQueryParams";
import { IFrameWindow } from "@crossmint/client-sdk-window";
import type { CrossmintApiClient } from "@crossmint/common-sdk-base";

export type CvcRecollectionServiceProps = {
    apiClient: CrossmintApiClient;
};

export function createCvcRecollectionService({ apiClient }: CvcRecollectionServiceProps) {
    function getIFrameUrl(props: CrossmintCvcRecollectionProps) {
        const urlWithPath = apiClient.buildUrl("/sdk/unstable/cvc-recollection");
        const queryParams = new URLSearchParams();

        // appendObjectToQueryParams drops function values, so the lifecycle
        // callbacks never reach the URL.
        appendObjectToQueryParams(queryParams, props);

        queryParams.append("apiKey", apiClient.crossmint.apiKey);
        queryParams.append("sdkMetadata", JSON.stringify(apiClient["internalConfig"].sdkMetadata));

        return `${urlWithPath}?${queryParams.toString()}`;
    }

    function createIframeClient(iframe: HTMLIFrameElement) {
        return IFrameWindow.initExistingIFrame(iframe, {
            incomingEvents: cvcRecollectionIncomingEvents,
            outgoingEvents: cvcRecollectionOutgoingEvents,
        });
    }

    return {
        iframe: {
            getUrl: getIFrameUrl,
            createClient: createIframeClient,
        },
    };
}
