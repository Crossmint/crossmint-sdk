import { createAgentCheckoutsApi } from "@crossmint/client-sdk-base";
import { useCrossmint } from "@crossmint/client-sdk-react-base";
import { useMemo } from "react";

import { createCrossmintApiClient } from "@/utils/createCrossmintApiClient";

/**
 * Agent checkouts for the signed-in buyer: create a checkout, read and answer its conversation,
 * stream its progress, and manage buyer and browser profiles. Calls use the provider's client
 * API key and its buyer JWT, or the `jwt` passed here when given.
 * @experimental Wraps `/api/unstable` routes; the signature may change in a minor release.
 */
export function useCrossmintAgentCheckouts(options: UseCrossmintAgentCheckoutsOptions = {}) {
    const { crossmint } = useCrossmint();
    const jwt = options.jwt ?? crossmint.jwt;
    const overrideBaseUrl = options.overrideBaseUrl ?? crossmint.overrideBaseUrl;
    return useMemo(
        () =>
            createAgentCheckoutsApi({
                apiClient: createCrossmintApiClient({ ...crossmint, jwt, overrideBaseUrl }, { usageOrigin: "client" }),
            }),
        [crossmint, jwt, overrideBaseUrl]
    );
}

export type UseCrossmintAgentCheckoutsOptions = {
    /** Buyer JWT for these calls; defaults to the provider's. */
    jwt?: string;
    /**
     * Where these calls go instead of the key's Crossmint environment, e.g. your backend's proxy
     * to Crossmint. Defaults to the provider's. Paths keep their `api/unstable/...` form.
     */
    overrideBaseUrl?: string;
};
