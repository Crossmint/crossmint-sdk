import { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import type { RecoveryMethodType } from "../../types/recoveryMethod";
import { getRecoveryMethodValidationError } from "../../utils/recoveryMethodUtils";
import { TypeFields, TypePicker } from "./RecoveryMethodFormFields";
import { errorHintStyle, hintStyle, sectionTitleStyle } from "./styles";

interface AddRecoveryMethodFormProps {
    availableTypes: readonly RecoveryMethodType[];
    supportsManagement: boolean;
    busy: boolean;
    onAdd: (type: RecoveryMethodType, fields: Record<string, string>) => Promise<boolean>;
}

export function AddRecoveryMethodForm({ availableTypes, supportsManagement, busy, onAdd }: AddRecoveryMethodFormProps) {
    const [type, setType] = useState<RecoveryMethodType>(availableTypes[0]);
    const [fields, setFields] = useState<Record<string, string>>({});
    const validationError = getRecoveryMethodValidationError(type, fields);
    const disabled = busy || !supportsManagement || validationError != null;

    const submit = async () => {
        if (await onAdd(type, fields)) setFields({});
    };

    return (
        <View>
            <Text style={sectionTitleStyle}>Add Recovery Method</Text>
            <Text style={hintStyle}>
                {supportsManagement
                    ? "Approved by the selected recovery method (or the wallet's only one)."
                    : "Only Solana and Stellar wallets support adding or removing recovery methods."}
            </Text>
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
                testID="recovery-methods-add-button"
                disabled={disabled}
                style={{
                    backgroundColor: "#fff",
                    padding: 12,
                    borderRadius: 8,
                    alignItems: "center",
                    marginTop: 8,
                    borderWidth: 1,
                    borderColor: "#E5E7EB",
                    opacity: disabled ? 0.5 : 1,
                }}
                onPress={submit}
            >
                <Text style={{ fontWeight: "600" }}>Add Recovery Method</Text>
            </TouchableOpacity>
        </View>
    );
}
