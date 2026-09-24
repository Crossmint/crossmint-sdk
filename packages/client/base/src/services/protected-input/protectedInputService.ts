import type { CrossmintProtectedInputProps } from "@/types/protected-input/CrossmintProtectedInputProps";
import { protectedInputIncomingEvents, protectedInputOutgoingEvents } from "@/types/protected-input/events";
import { appendObjectToQueryParams } from "@/utils/appendObjectToQueryParams";
import { IFrameWindow } from "@crossmint/client-sdk-window";
import type { CrossmintApiClient } from "@crossmint/common-sdk-base";

export type ProtectedInputServiceProps = {
    apiClient: CrossmintApiClient;
};

export type ProtectedInputIFrameUrlOptions = {
    /**
     * Origin of the embedding page (`window.location.origin`). The hosted page posts its
     * events only to this origin, so a page that embeds the iframe from elsewhere hears nothing.
     */
    targetOrigin: string;
};

const MAX_LABEL_LENGTH = 120;

/**
 * Checks the props the hosted page would otherwise reject with `invalid_params`, so the
 * integrator gets a clear message before the iframe loads. Returns `null` when they are valid.
 */
export function validateProtectedInputProps(
    props: Pick<CrossmintProtectedInputProps, "merchantUrl" | "expiresAt" | "label">
): string | null {
    let merchantUrl: URL;
    try {
        merchantUrl = new URL(props.merchantUrl);
    } catch {
        return "merchantUrl must be an absolute URL, for example https://shop.example.com/login.";
    }
    if (merchantUrl.protocol !== "https:" && merchantUrl.protocol !== "http:") {
        return "merchantUrl must use http or https.";
    }
    if (props.expiresAt != null && !Number.isFinite(Date.parse(props.expiresAt))) {
        return "expiresAt must be an ISO 8601 datetime.";
    }
    if (props.label != null && props.label.length > MAX_LABEL_LENGTH) {
        return `label must be at most ${MAX_LABEL_LENGTH} characters.`;
    }
    return null;
}

export function createProtectedInputService({ apiClient }: ProtectedInputServiceProps) {
    function getIFrameUrl(props: CrossmintProtectedInputProps, { targetOrigin }: ProtectedInputIFrameUrlOptions) {
        const validationError = validateProtectedInputProps(props);
        if (validationError != null) {
            throw new Error(`CrossmintProtectedInput: ${validationError}`);
        }

        const urlWithPath = apiClient.buildUrl("/sdk/unstable/protected-input");
        const queryParams = new URLSearchParams();

        // Only the params of the hosted page contract, picked by name, so an extra key on the
        // props object (or a future prop) never reaches the URL. Objects (appearance) are
        // JSON-encoded; plain strings are sent as-is; unset values are skipped.
        const { jwt, merchantUrl, expiresAt, label, appearance } = props;
        appendObjectToQueryParams(queryParams, { merchantUrl, expiresAt, label, appearance });

        queryParams.append("jwt", jwt);
        queryParams.append("targetOrigin", targetOrigin);
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
