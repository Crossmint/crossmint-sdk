import { CrossmintVerificationButtonProps } from "@/types";
import { getEnvironmentBaseUrl } from "@/utils";

export function crossmintVerificationService(props: CrossmintVerificationButtonProps) {
    const targetOrigin = getEnvironmentBaseUrl(props.environment);

    function getUrl() {
        const queryParams = new URLSearchParams({
            collectionId: props.collectionId,
            scopes: JSON.stringify(props.scopes),
            ...(props.fields != null && { fields: JSON.stringify(props.fields) }),
        });
        return `${targetOrigin}/sdk/2024-03-05/verification?${queryParams.toString()}`;
    }

    return {
        getUrl,
    };
}
