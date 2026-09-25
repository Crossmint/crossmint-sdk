import { createCrossmintApiClient } from "@/utils/createCrossmintApiClient";
import { createOrderIntentsApi } from "@crossmint/client-sdk-base";
import { useCrossmint } from "@crossmint/client-sdk-react-base";
import { useMemo } from "react";

/**
 * The buyer's order intents, as the buyer named by `jwt` (the same token the components take).
 * Meant for `getOrderIntent(id)` and `cancelOrderIntent(id)` after `CrossmintAgentCardAuthorization`
 * reported an id; the component itself handles registration and creation.
 * @experimental
 */
export function useOrderIntents(jwt: string) {
    const { crossmint } = useCrossmint();
    return useMemo(
        () =>
            createOrderIntentsApi({
                apiClient: createCrossmintApiClient({ ...crossmint, jwt }, { usageOrigin: "client" }),
            }),
        [crossmint, jwt]
    );
}
