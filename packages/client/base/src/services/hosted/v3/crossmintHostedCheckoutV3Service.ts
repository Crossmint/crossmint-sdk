import type { CrossmintHostedCheckoutV3Props } from "@/types/hosted/v3/CrossmintHostedCheckoutV3Props";
import { appendObjectToQueryParams } from "@/utils/appendObjectToQueryParams";
import { NewTabWindow, PopupWindow } from "@crossmint/client-sdk-window";
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

    function createPopupClient(url: string) {
        return PopupWindow.initSync(url, {
            width: 450,
            height: 750,
            crossOrigin: true,
        });
    }

    function createNewTabClient(url: string): ReturnType<typeof NewTabWindow.initSync> {
        return NewTabWindow.initSync(url, {});
    }

    // TODO: Implement same tab client appropriately
    function navigateInSameTab(url: string): undefined {
        window.location.href = url;
    }

    function createWindow() {
        const displayType = hostedCheckoutProps.appearance?.display || "popup";
        const url = getUrl(hostedCheckoutProps);

        if (displayType === "same-tab") {
            navigateInSameTab(url);
            return;
        }

        let windowClient: ReturnType<typeof PopupWindow.initSync> | ReturnType<typeof NewTabWindow.initSync>;
        switch (displayType) {
            case "popup":
                windowClient = createPopupClient(url);
                break;
            case "new-tab":
                windowClient = createNewTabClient(url);
                break;
            default:
                throw new Error(`Invalid display type: ${displayType}`);
        }

        if (hostedCheckoutProps.appearance?.overlay?.enabled !== false) {
            overlayService.create(windowClient);
        }
    }

    return {
        createWindow,
    };
}
