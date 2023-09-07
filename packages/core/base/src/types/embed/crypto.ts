import { CommonEmbeddedCheckoutProps } from ".";
import { CryptoPaymentMethod } from "..";

export type CryptoEmbeddedCheckoutProps<PM extends CryptoPaymentMethod = CryptoPaymentMethod> =
    CommonEmbeddedCheckoutProps<PM> & {
        signer?: CryptoPaymentMethodSignerMap[PM];
    };

type CryptoPaymentMethodSignerMap = {
    [CryptoPaymentMethod.ETH]: ETHEmbeddedCheckoutSigner;
    [CryptoPaymentMethod.SOL]: SOLEmbeddedCheckoutSigner;
};

type CommonEmbeddedCheckoutSignerProps = {
    address: string;
};

// Signers
export type ETHEmbeddedCheckoutSigner = CommonEmbeddedCheckoutSignerProps & {
    signAndSendTransaction: (transaction: any) => Promise<string>;
};

export type SOLEmbeddedCheckoutSigner = CommonEmbeddedCheckoutSignerProps & {
    signAndSendTransaction: (transaction: any) => Promise<string>;
};
