import { CSSProperties, MouseEvent } from "react";

import { CrossmintVerificationButtonProps, crossmintVerificationService } from "@crossmint/client-sdk-base";
import { PopupWindow } from "@crossmint/client-sdk-window";

export type CrossmintVerificationButtonReactProps = CrossmintVerificationButtonProps & {
    onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
    style?: CSSProperties;
};

export function CrossmintVerificationButton(props: CrossmintVerificationButtonReactProps) {
    const { getUrl } = crossmintVerificationService({
        collectionId: props.collectionId,
        scopes: props.scopes,
        environment: props.environment,
        fields: props.fields,
    });

    async function onClick() {
        PopupWindow.init(getUrl(), { width: 400, height: 650 });
    }

    // TODO: Styling
    return <button onClick={onClick}>Verify collection</button>;
}
