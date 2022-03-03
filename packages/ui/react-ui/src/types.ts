import { CSSProperties, MouseEvent } from "react";
import { CrossmintPayButtonProps, BaseButtonProps } from "@crossmint/client-sdk-base";

export interface CrossmintPayButtonReactProps extends CrossmintPayButtonProps {
    onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
    style?: CSSProperties;
}

export interface CrossmintStatusButtonReactProps extends BaseButtonProps {
    onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
    style?: CSSProperties;
}
