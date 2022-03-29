import { CrossmintPayButtonProps } from "@crossmint/client-sdk-base";

export interface CrossmintPayButtonLitProps extends CrossmintPayButtonProps {
    onClick?: (e: any) => void;
}
