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

        // An empty array would serialize as `[]` (appendObjectToQueryParams only
        // skips falsy values, and `![]` is false), which the iframe would read as
        // "render nothing" instead of applying the documented default. Drop these
        // keys when empty so the iframe defaults apply (`allowedPaymentMethodTypes`
        // → `["card"]`, `allowedModes` → `["new"]`).
        const { allowedPaymentMethodTypes, allowedModes, ...rest } = props;
        // `children` is the host's own button, rendered outside the iframe; a React
        // element in the URL would just stringify into it.
        const { children: _children, ...serializableRest } = rest as typeof rest & { children?: unknown };
        const serializableProps = {
            ...serializableRest,
            ...(allowedPaymentMethodTypes?.length ? { allowedPaymentMethodTypes } : {}),
            ...(allowedModes?.length ? { allowedModes } : {}),
            // `footer=host` asks new iframes to hide their "Powered by Crossmint" so the
            // SDK draws it below `children`. Old iframes ignore it and keep theirs.
            ...(rest.hideSubmitButton ? { footer: "host" } : {}),
        };

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
