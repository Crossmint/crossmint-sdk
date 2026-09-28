import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity } from "react-native";
import { MULTI_RECOVERY_CHAINS, type RecoveryMethodType } from "../../types/recoveryMethod";
import { getRecoveryMethodValidationError } from "../../utils/recoveryMethodUtils";
import { signerLabel } from "../../utils/signerUtils";
import { TypeFields, TypePicker } from "./RecoveryMethodFormFields";
import { errorHintStyle, hintStyle, inputStyle, sectionTitleStyle } from "./styles";

interface CreateWalletWithRecoveryFormProps {
    availableTypes: readonly RecoveryMethodType[];
    pendingMethods: any[];
    busy: boolean;
    onQueue: (type: RecoveryMethodType, fields: Record<string, string>) => Promise<boolean>;
    onUnqueue: (index: number) => void;
    onCreate: (chain: string, alias: string) => Promise<boolean>;
}

/** Queue several recovery methods, then create a wallet that has all of them. */
export function CreateWalletWithRecoveryForm({
    availableTypes,
    pendingMethods,
    busy,
    onQueue,
    onUnqueue,
    onCreate,
}: CreateWalletWithRecoveryFormProps) {
    const [chain, setChain] = useState<string>(MULTI_RECOVERY_CHAINS[0]);
    const [alias, setAlias] = useState("");
    const [type, setType] = useState<RecoveryMethodType>(availableTypes[0]);
    const [fields, setFields] = useState<Record<string, string>>({});
    const validationError = getRecoveryMethodValidationError(type, fields);
    const queueDisabled = busy || validationError != null;
    const createDisabled = busy || pendingMethods.length === 0;

    const queue = async () => {
        if (await onQueue(type, fields)) setFields({});
    };

    return (
        <View>
            <Text style={sectionTitleStyle}>Create Wallet With Multiple Recovery Methods</Text>
            <Text style={hintStyle}>
                Queue recovery methods, then create the wallet. Each one can authorize on its own.
            </Text>
            <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                {MULTI_RECOVERY_CHAINS.map((c) => (
                    <TouchableOpacity
                        key={c}
                        testID={`recovery-methods-chain-${c}`}
                        onPress={() => setChain(c)}
                        style={{
                            flex: 1,
                            padding: 10,
                            borderRadius: 8,
                            alignItems: "center",
                            backgroundColor: chain === c ? "#13b601" : "#fff",
                            borderWidth: 1,
                            borderColor: chain === c ? "#13b601" : "#E5E7EB",
                        }}
                    >
                        <Text style={{ color: chain === c ? "#fff" : "#1A1A1A", fontWeight: "500", fontSize: 13 }}>
                            {c}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
            <TextInput
                style={inputStyle}
                placeholder="alias (optional, lets one user hold several wallets per chain)"
                value={alias}
                onChangeText={setAlias}
                autoCapitalize="none"
            />
            <TypePicker
                types={availableTypes}
                value={type}
                onChange={(t) => {
                    setType(t);
                    setFields({});
                }}
            />
            <TypeFields type={type} fields={fields} setField={(k, v) => setFields((prev) => ({ ...prev, [k]: v }))} />
            {validationError != null && <Text style={errorHintStyle}>{validationError}</Text>}
            <TouchableOpacity
                testID="recovery-methods-queue-button"
                disabled={queueDisabled}
                style={{
                    backgroundColor: "#fff",
                    padding: 10,
                    borderRadius: 8,
                    alignItems: "center",
                    marginTop: 8,
                    borderWidth: 1,
                    borderColor: "#E5E7EB",
                    opacity: queueDisabled ? 0.5 : 1,
                }}
                onPress={queue}
            >
                <Text style={{ fontWeight: "500" }}>Queue Recovery Method</Text>
            </TouchableOpacity>
            {pendingMethods.length > 0 && (
                <View style={{ marginTop: 8 }}>
                    {pendingMethods.map((m, i) => (
                        <View
                            key={i}
                            style={{
                                flexDirection: "row",
                                justifyContent: "space-between",
                                alignItems: "center",
                                padding: 8,
                                marginBottom: 4,
                                borderRadius: 6,
                                backgroundColor: "#fff",
                                borderWidth: 1,
                                borderColor: "#E5E7EB",
                            }}
                        >
                            <Text style={{ fontSize: 12 }}>{signerLabel(m)}</Text>
                            <TouchableOpacity onPress={() => onUnqueue(i)}>
                                <Text style={{ fontSize: 12, color: "#EF4444" }}>remove</Text>
                            </TouchableOpacity>
                        </View>
                    ))}
                </View>
            )}
            <TouchableOpacity
                testID="recovery-methods-create-button"
                disabled={createDisabled}
                style={{
                    backgroundColor: "#13b601",
                    padding: 12,
                    borderRadius: 8,
                    alignItems: "center",
                    marginTop: 8,
                    opacity: createDisabled ? 0.5 : 1,
                }}
                onPress={() => onCreate(chain, alias)}
            >
                <Text style={{ color: "#fff", fontWeight: "600" }}>
                    Create Wallet ({pendingMethods.length} recovery method{pendingMethods.length === 1 ? "" : "s"})
                </Text>
            </TouchableOpacity>
        </View>
    );
}
