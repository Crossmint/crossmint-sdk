import { BaseButtonProps, CrossmintPayButtonProps } from "@crossmint/client-sdk-base";

export interface CrossmintPayButtonLitProps extends CrossmintPayButtonProps {
    onClick?: (e: any) => void;
}

export interface CrossmintStatusButtonLitProps extends BaseButtonProps {
    onClick?: (e: any) => void;
}
