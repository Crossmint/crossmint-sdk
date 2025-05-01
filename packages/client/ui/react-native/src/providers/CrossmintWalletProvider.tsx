import { useContext, useMemo, type ReactNode } from "react";
import {
    CrossmintWalletProvider as BaseCrossmintWalletProvider,
    WalletContext as BaseWalletContext,
} from "@crossmint/client-sdk-react-base";
import {
    CrossmintRecoveryKeyProvider,
    CrossmintRecoveryKeyContext,
    type CrossmintRecoveryKeyContextState,
    type CrossmintRecoveryKeyProviderProps,
} from "./CrossmintRecoveryKeyProvider";
import { WalletContext, type ReactNativeWalletContextState } from "@/hooks/useWallet";

const recoveryKeyPropNames: Array<keyof CrossmintRecoveryKeyContextState> = [
    "experimental_recoveryKeyStatus",
    "experimental_recoverySigner",
    "experimental_createRecoveryKeySigner",
    "experimental_validateEmailOtp",
];

function WalletProviderInternal({ children }: { children: ReactNode }) {
    const baseWalletState = useContext(BaseWalletContext);
    const recoveryKeyState = useContext(CrossmintRecoveryKeyContext);

    if (baseWalletState == null) {
        throw new Error("BaseWalletContext not found. Ensure CrossmintWalletProvider structure is correct.");
    }

    const combinedState = useMemo(() => {
        const state: BaseWalletContext = {
            ...baseWalletState,
        };

        if (recoveryKeyState != null) {
            Object.assign(state, recoveryKeyState);
        } else {
            for (const propName of recoveryKeyPropNames) {
                Object.defineProperty(state, propName, {
                    get() {
                        throw new Error(
                            `Cannot access '${propName}'. Ensure 'experimental_enableRecoveryKeys={true}' is set on CrossmintWalletProvider.`
                        );
                    },
                    enumerable: true,
                    configurable: true,
                });
            }
        }
        return state as ReactNativeWalletContextState;
    }, [baseWalletState, recoveryKeyState]);

    return <WalletContext.Provider value={combinedState}>{children}</WalletContext.Provider>;
}

export interface CrossmintWalletProviderProps extends Omit<CrossmintRecoveryKeyProviderProps, "children"> {
    children: ReactNode;
    experimental_enableRecoveryKeys?: boolean;
}

export function CrossmintWalletProvider({
    children,
    experimental_enableRecoveryKeys = false,
    experimental_secureEndpointUrl,
}: CrossmintWalletProviderProps) {
    const WalletTree = (
        <BaseCrossmintWalletProvider>
            <WalletProviderInternal>{children}</WalletProviderInternal>
        </BaseCrossmintWalletProvider>
    );

    if (experimental_enableRecoveryKeys) {
        return (
            <CrossmintRecoveryKeyProvider experimental_secureEndpointUrl={experimental_secureEndpointUrl}>
                {WalletTree}
            </CrossmintRecoveryKeyProvider>
        );
    }

    return WalletTree;
}
