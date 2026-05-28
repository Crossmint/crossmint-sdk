import type { CrossmintEmbeddedWithdrawProps } from "@/types/embed/withdraw/CrossmintEmbeddedWithdrawProps";
import { embeddedWithdrawIncomingEvents, embeddedWithdrawOutgoingEvents } from "@/types/embed/withdraw/events";
import { appendObjectToQueryParams } from "@/utils/appendObjectToQueryParams";

import { IFrameWindow } from "@crossmint/client-sdk-window";
import type { CrossmintApiClient } from "@crossmint/common-sdk-base";

export type CrossmintEmbeddedWithdrawServiceProps = {
    apiClient: CrossmintApiClient;
};

export function crossmintEmbeddedWithdrawService({ apiClient }: CrossmintEmbeddedWithdrawServiceProps) {
    function getIFrameUrl(props: CrossmintEmbeddedWithdrawProps) {
        const sdkMetadata = apiClient["internalConfig"].sdkMetadata;
        const urlWithPath = apiClient.buildUrl("/sdk/2024-03-05/embedded-withdraw");
        const queryParams = new URLSearchParams();

        appendObjectToQueryParams(queryParams, props);

        queryParams.append("apiKey", apiClient.crossmint.apiKey);
        queryParams.append("sdkMetadata", JSON.stringify(sdkMetadata));

        return `${urlWithPath}?${queryParams.toString()}`;
    }

    function createIframeClient(iframe: HTMLIFrameElement) {
        return IFrameWindow.initExistingIFrame(iframe, {
            incomingEvents: embeddedWithdrawIncomingEvents,
            outgoingEvents: embeddedWithdrawOutgoingEvents,
        });
    }

    return {
        iframe: {
            getUrl: getIFrameUrl,
            createClient: createIframeClient,
        },
    };
}
