import type { CrossmintPaymentMethodManagementProps } from "@/types/payment-method-management/CrossmintPaymentMethodManagementProps";
import {
    paymentMethodManagementIncomingEvents,
    paymentMethodManagementOutgoingEvents,
} from "@/types/payment-method-management/events";
import { appendObjectToQueryParams } from "@/utils/appendObjectToQueryParams";
import { IFrameWindow } from "@crossmint/client-sdk-window";
import type { CrossmintApiClient } from "@crossmint/common-sdk-base";

export type PaymentMethodManagementServiceProps = {
    apiClient: CrossmintApiClient;
};

export function createPaymentMethodManagementService({ apiClient }: PaymentMethodManagementServiceProps) {
    function getIFrameUrl(props: CrossmintPaymentMethodManagementProps) {
        const urlWithPath = apiClient.buildUrl("/sdk/unstable/payment-method-management");
        const queryParams = new URLSearchParams();

        // An empty `allowedPaymentMethodTypes` array would serialize as `[]`
        // (appendObjectToQueryParams only skips falsy values, and `![]` is false),
        // which the iframe would read as "offer no types" instead of the documented
        // `["card"]` default. Drop the key when empty so the default applies.
        const { allowedPaymentMethodTypes, ...rest } = props;
        const serializableProps = allowedPaymentMethodTypes?.length ? props : rest;

        appendObjectToQueryParams(queryParams, serializableProps);

        queryParams.append("apiKey", apiClient.crossmint.apiKey);
        queryParams.append("sdkMetadata", JSON.stringify(apiClient["internalConfig"].sdkMetadata));

        return `${urlWithPath}?${queryParams.toString()}`;
    }

    function createIframeClient(iframe: HTMLIFrameElement) {
        return IFrameWindow.initExistingIFrame(iframe, {
            incomingEvents: paymentMethodManagementIncomingEvents,
            outgoingEvents: paymentMethodManagementOutgoingEvents,
        });
    }

    return {
        iframe: {
            getUrl: getIFrameUrl,
            createClient: createIframeClient,
        },
    };
}
