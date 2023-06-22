import { CSSProperties, MouseEvent } from "react";

import { BaseButtonProps, CrossmintPayButtonProps } from "@crossmint/client-sdk-base";

export type CrossmintPayButtonReactProps = CrossmintPayButtonProps & {
    onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
    style?: CSSProperties;
};

export type CrossmintStatusButtonReactProps = BaseButtonProps & {
    onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
    style?: CSSProperties;
};
