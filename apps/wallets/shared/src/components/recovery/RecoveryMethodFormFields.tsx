import { View, Text, TextInput, TouchableOpacity } from "react-native";
import type { RecoveryMethodType } from "../../types/recoveryMethod";
import { inputStyle } from "./styles";

export function TypePicker({
    types,
    value,
    onChange,
}: {
    types: readonly RecoveryMethodType[];
    value: RecoveryMethodType;
    onChange: (type: RecoveryMethodType) => void;
}) {
    return (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
            {types.map((t) => (
                <TouchableOpacity
                    key={t}
                    onPress={() => onChange(t)}
                    style={{
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        borderRadius: 6,
                        backgroundColor: value === t ? "#13b601" : "#fff",
                        borderWidth: 1,
                        borderColor: value === t ? "#13b601" : "#E5E7EB",
                    }}
                >
                    <Text style={{ fontSize: 12, color: value === t ? "#fff" : "#1A1A1A", fontWeight: "500" }}>
                        {t}
                    </Text>
                </TouchableOpacity>
            ))}
        </View>
    );
}

const FIELD_BY_TYPE: Record<RecoveryMethodType, { key: string; placeholder: string; secure?: boolean }> = {
    email: { key: "email", placeholder: "email (blank = logged-in user)" },
    phone: { key: "phone", placeholder: "phone (e.g. +15551234567)" },
    passkey: { key: "name", placeholder: "name (e.g. 'My Yubikey')" },
    "external-wallet": { key: "address", placeholder: "address" },
    server: { key: "secret", placeholder: "signer secret (64 hex or xmsk1_...)", secure: true },
};

export function TypeFields({
    type,
    fields,
    setField,
}: {
    type: RecoveryMethodType;
    fields: Record<string, string>;
    setField: (key: string, value: string) => void;
}) {
    const { key, placeholder, secure } = FIELD_BY_TYPE[type];
    return (
        <TextInput
            style={inputStyle}
            secureTextEntry={secure}
            placeholder={placeholder}
            value={fields[key] ?? ""}
            onChangeText={(v) => setField(key, v)}
            autoCapitalize="none"
        />
    );
}
