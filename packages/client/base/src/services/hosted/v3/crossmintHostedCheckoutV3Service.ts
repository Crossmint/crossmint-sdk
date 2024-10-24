import type { CrossmintHostedCheckoutV3Props } from "@/types/hosted/v3/CrossmintHostedCheckoutV3Props";
import { appendObjectToQueryParams } from "@/utils/appendObjectToQueryParams";
import { PopupWindow } from "@crossmint/client-sdk-window";
import type { CrossmintApiClient } from "@crossmint/common-sdk-base";
import { crossmintHostedCheckoutOverlayService } from "./crossmintHostedCheckoutOverlayService";

export type CrossmintHostedCheckoutV3ServiceProps = {
    apiClient: CrossmintApiClient;
    hostedCheckoutProps: CrossmintHostedCheckoutV3Props;
};

export function crossmintHostedCheckoutV3Service({
    apiClient,
    hostedCheckoutProps,
}: CrossmintHostedCheckoutV3ServiceProps) {
    const overlayService = crossmintHostedCheckoutOverlayService();

    function getUrl(props: CrossmintHostedCheckoutV3Props) {
        const urlWithPath = apiClient.buildUrl("/sdk/2024-03-05/hosted-checkout");
        const queryParams = new URLSearchParams();

        appendObjectToQueryParams(queryParams, props);

        queryParams.append("apiKey", apiClient.crossmint.apiKey);
        queryParams.append("sdkMetadata", JSON.stringify(apiClient["internalConfig"].sdkMetadata));

        return `${urlWithPath}?${queryParams.toString()}`;
    }

    function createPopupClient() {
        const url = getUrl(hostedCheckoutProps);
        return PopupWindow.initSync(url, {
            width: 450,
            height: 750,
            crossOrigin: true,
        });
    }

    // TODO: Implement new tab client
    function createNewTabClient(): ReturnType<typeof PopupWindow.initSync> {
        throw new Error("Not implemented");
    }

    // TODO: Implement same tab client
    function createSameTabClient(): ReturnType<typeof PopupWindow.initSync> {
        throw new Error("Not implemented");
    }

    function createWindow() {
        const displayType = hostedCheckoutProps.appearance?.display || "popup";
        let windowClient: ReturnType<typeof PopupWindow.initSync>;
        switch (displayType) {
            case "popup":
                windowClient = createPopupClient();
                break;
            case "same-tab":
                windowClient = createSameTabClient();
                break;
            case "new-tab":
                windowClient = createNewTabClient();
                break;
            default:
                throw new Error(`Invalid display type: ${displayType}`);
        }

        if (hostedCheckoutProps.appearance?.overlay?.enabled !== false && displayType !== "same-tab") {
            overlayService.create(windowClient);
        }
    }

    return {
        createWindow,
    };
}
