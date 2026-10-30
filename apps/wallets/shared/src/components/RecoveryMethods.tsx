import { View, Text } from "react-native";
import { AddRecoveryMethodForm } from "./recovery/AddRecoveryMethodForm";
import { CreateWalletWithRecoveryForm } from "./recovery/CreateWalletWithRecoveryForm";
import { RecoveryMethodList } from "./recovery/RecoveryMethodList";
import { useRecoveryMethodActions } from "./recovery/useRecoveryMethodActions";

const separator = <View style={{ height: 1, backgroundColor: "#E5E7EB", marginVertical: 12 }} />;

interface RecoveryMethodsProps {
    wallet: any;
    /** Creates a wallet with the given recovery methods; the playground shows the result via the wallet provider. */
    createWallet?: (args: { chain: string; recoveryMethods: any[]; alias?: string }) => Promise<any>;
    /** Omit on platforms without passkey support: the "passkey" option is then hidden. */
    createPasskeySigner?: (name: string) => Promise<any>;
    /** Builds an external-wallet signer with `onSign` from a private key, needed to authorize with that method. */
    buildExternalWalletSignerFn?: (chain: string, privateKey: string) => any;
}

export function RecoveryMethods(props: RecoveryMethodsProps) {
    const actions = useRecoveryMethodActions(props);

    return (
        <View style={{ backgroundColor: "#F7F8FA", borderRadius: 12, padding: 16 }}>
            <RecoveryMethodList
                recoveryMethods={actions.recoveryMethods}
                selected={actions.selected}
                selectedLocator={actions.selectedLocator}
                onSelect={actions.setSelectedLocator}
                authPrivateKey={actions.authPrivateKey}
                onAuthPrivateKeyChange={actions.setAuthPrivateKey}
                authSecret={actions.authSecret}
                onAuthSecretChange={actions.setAuthSecret}
                canAuthorizeExternalWallet={actions.canAuthorizeExternalWallet}
                supportsManagement={actions.supportsManagement}
                busy={actions.busy}
                onUse={actions.useRecoveryMethod}
                onRemove={actions.removeRecoveryMethod}
            />

            {separator}

            <AddRecoveryMethodForm
                availableTypes={actions.availableTypes}
                supportsManagement={actions.supportsManagement}
                busy={actions.busy}
                onAdd={actions.addRecoveryMethod}
            />

            {separator}

            <CreateWalletWithRecoveryForm
                availableTypes={actions.availableTypes}
                pendingMethods={actions.pendingMethods}
                busy={actions.busy}
                onQueue={actions.queueMethod}
                onUnqueue={actions.unqueueMethod}
                onCreate={actions.createWalletWithMethods}
            />

            {actions.status !== "" && (
                <Text
                    testID="recovery-methods-status"
                    style={{
                        fontSize: 11,
                        fontFamily: "monospace",
                        backgroundColor: "#fff",
                        padding: 8,
                        borderRadius: 6,
                        marginTop: 8,
                    }}
                >
                    {actions.status}
                </Text>
            )}
        </View>
    );
}
