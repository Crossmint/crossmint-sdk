import { CSSProperties, MouseEvent } from "react";

import { CrossmintPayButtonProps } from "@crossmint/client-sdk-base";

export type CrossmintPayButtonReactProps = CrossmintPayButtonProps & {
    onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
    style?: CSSProperties;
};
