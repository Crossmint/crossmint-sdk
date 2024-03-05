import { CSSProperties, MouseEvent } from "react";

import { CrossmintVerificationButtonProps } from "@crossmint/client-sdk-base";

export type CrossmintVerificationButtonReactProps = CrossmintVerificationButtonProps & {
    onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
    style?: CSSProperties;
};

export function CrossmintVerificationButton(props: CrossmintVerificationButtonReactProps) {
    return <p>TODO</p>;
}
