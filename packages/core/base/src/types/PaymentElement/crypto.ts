import { CommonPaymentElementProps } from ".";
import { CryptoPaymentMethod } from "..";

export type CryptoPaymentElementProps<PM extends CryptoPaymentMethod = CryptoPaymentMethod> =
    CommonPaymentElementProps<PM> & {
        signer?: CryptoPaymentMethodSignerMap[PM];
    };

type CryptoPaymentMethodSignerMap = {
    [CryptoPaymentMethod.ETH]: ETHPaymentElementSigner;
    [CryptoPaymentMethod.SOL]: SOLPaymentElementSigner;
};

type CommonPaymentElementSignerProps = {
    address: string;
};

// Signers
export type ETHPaymentElementSigner = CommonPaymentElementSignerProps & {
    signAndSendTransaction: (transaction: any) => Promise<any>;
};

export type SOLPaymentElementSigner = CommonPaymentElementSignerProps & {
    signTransaction: (transaction: any) => Promise<any>;
};
