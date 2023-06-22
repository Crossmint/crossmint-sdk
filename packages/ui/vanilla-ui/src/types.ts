import { BaseButtonProps, CrossmintPayButtonProps } from "@crossmint/client-sdk-base";

export type CrossmintPayButtonLitProps = CrossmintPayButtonProps & {
    onClick?: (e: any) => void;
};

export type CrossmintStatusButtonLitProps = BaseButtonProps & {
    onClick?: (e: any) => void;
};
