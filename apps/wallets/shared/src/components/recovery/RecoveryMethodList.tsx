import { View, Text, TextInput, TouchableOpacity } from "react-native";
import { getSignerLocator, signerLabel } from "../../utils/signerUtils";
import { hintStyle, inputStyle, sectionTitleStyle } from "./styles";

interface RecoveryMethodListProps {
    recoveryMethods: any[];
    selected: any | undefined;
    selectedLocator: string;
    onSelect: (locator: string) => void;
    authPrivateKey: string;
    onAuthPrivateKeyChange: (value: string) => void;
    authSecret: string;
    onAuthSecretChange: (value: string) => void;
    canAuthorizeExternalWallet: boolean;
    supportsManagement: boolean;
    busy: boolean;
    onUse: () => void;
    onRemove: () => void;
}

/** Lists the wallet's recovery methods and lets the user authorize with (useRecoveryMethod) or remove one. */
export function RecoveryMethodList({
    recoveryMethods,
    selected,
    selectedLocator,
    onSelect,
    authPrivateKey,
    onAuthPrivateKeyChange,
    authSecret,
    onAuthSecretChange,
    canAuthorizeExternalWallet,
    supportsManagement,
    busy,
    onUse,
    onRemove,
}: RecoveryMethodListProps) {
    const useDisabled = busy || selected == null;
    const removeDisabled = useDisabled || !supportsManagement;
    return (
        <View>
            <Text style={sectionTitleStyle}>Recovery Methods</Text>
            <Text style={hintStyle}>
                Tap one to select it, then authorize admin operations with it or remove it from the wallet.
            </Text>
            <View testID="recovery-methods-list" style={{ marginTop: 8 }}>
                {recoveryMethods.length === 0 && (
                    <Text style={{ fontSize: 12, color: "#6B7280" }}>No recovery methods on this wallet</Text>
                )}
                {recoveryMethods.map((m, i) => {
                    const locator = getSignerLocator(m);
                    const isSelected = locator === selectedLocator;
                    return (
                        <TouchableOpacity
                            key={`${locator}-${i}`}
                            onPress={() => onSelect(locator)}
                            style={{
                                padding: 8,
                                marginBottom: 4,
                                borderRadius: 6,
                                backgroundColor: isSelected ? "#e8fae6" : "#FFF7ED",
                                borderWidth: 1,
                                borderColor: isSelected ? "#13b601" : "#F59E0B",
                            }}
                        >
                            <Text style={{ fontSize: 12, fontWeight: "600" }}>{signerLabel(m)}</Text>
                            <Text style={{ fontSize: 10, color: "#6B7280", marginTop: 1 }}>{locator}</Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
            {selected?.type === "external-wallet" && canAuthorizeExternalWallet && (
                <TextInput
                    style={inputStyle}
                    secureTextEntry
                    placeholder="Private key for this external wallet (to authorize with it)"
                    value={authPrivateKey}
                    onChangeText={onAuthPrivateKeyChange}
                    autoCapitalize="none"
                />
            )}
            {selected?.type === "server" && (
                <TextInput
                    style={inputStyle}
                    secureTextEntry
                    placeholder="Signer secret for this server signer (to authorize with it)"
                    value={authSecret}
                    onChangeText={onAuthSecretChange}
                    autoCapitalize="none"
                />
            )}
            <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                <TouchableOpacity
                    testID="recovery-methods-use-button"
                    disabled={useDisabled}
                    style={{
                        flex: 1,
                        backgroundColor: "#13b601",
                        padding: 10,
                        borderRadius: 8,
                        alignItems: "center",
                        opacity: useDisabled ? 0.5 : 1,
                    }}
                    onPress={onUse}
                >
                    <Text style={{ color: "#fff", fontWeight: "600" }}>Authorize with</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    testID="recovery-methods-remove-button"
                    disabled={removeDisabled}
                    style={{
                        flex: 1,
                        backgroundColor: "#fff",
                        padding: 10,
                        borderRadius: 8,
                        alignItems: "center",
                        borderWidth: 1,
                        borderColor: "#EF4444",
                        opacity: removeDisabled ? 0.5 : 1,
                    }}
                    onPress={onRemove}
                >
                    <Text style={{ color: "#EF4444", fontWeight: "600" }}>Remove</Text>
                </TouchableOpacity>
            </View>
            <Text style={{ ...hintStyle, marginTop: 4 }}>
                "Authorize with" calls useRecoveryMethod: it picks which recovery method approves addSigner /
                removeSigner / addRecoveryMethod / removeRecoveryMethod without changing the active signer.
            </Text>
        </View>
    );
}
