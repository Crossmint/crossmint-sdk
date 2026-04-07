import { useState, useEffect, useCallback } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView } from "react-native";
import { useWallet } from "@crossmint/client-sdk-react-native-ui";

const SIGNER_TYPES = ["device", "passkey", "external-wallet"] as const;
type SignerType = (typeof SIGNER_TYPES)[number];

function getSignerLocator(s: any): string {
    if (typeof s === "string") return s;
    return s.locator ?? JSON.stringify(s);
}

function signerLabel(s: any): string {
    const loc = getSignerLocator(s);
    const [type] = loc.split(":");
    const rest = loc.slice(type.length + 1);
    if (!rest) return loc;
    if (rest.length > 20) return `${type}: ${rest.slice(0, 8)}...${rest.slice(-8)}`;
    return `${type}: ${rest}`;
}

function buildSignerConfig(type: SignerType, fields: Record<string, string>) {
    const config: Record<string, string> = { type };
    if (type === "passkey") {
        if (fields.id) config.id = fields.id;
        if (fields.name) config.name = fields.name;
    } else if (type === "external-wallet") {
        if (fields.address) config.address = fields.address;
    }
    return config;
}

export function Permissions() {
    const { wallet, createDeviceSigner, createPasskeySigner } = useWallet();
    const [signers, setSigners] = useState<any[]>([]);
    const [signerType, setSignerType] = useState<SignerType>("device");
    const [fields, setFields] = useState<Record<string, string>>({});
    const [selectedSigner, setSelectedSigner] = useState<any>(null);
    const [selectedLocator, setSelectedLocator] = useState<string>("");
    const [recoveryNeeded, setRecoveryNeeded] = useState<boolean | null>(null);
    const [status, setStatus] = useState("");

    const setField = (key: string, value: string) => setFields((prev) => ({ ...prev, [key]: value }));

    const loadSigners = useCallback(async () => {
        if (!wallet) return;
        const res = await wallet.signers();
        setSigners(res ?? []);
    }, [wallet]);

    useEffect(() => {
        loadSigners();
    }, [loadSigners]);

    const selectSigner = (s: any) => {
        const locator = getSignerLocator(s);
        setSelectedSigner(s);
        setSelectedLocator(locator);
    };

    const handleUseSigner = async () => {
        if (!wallet) return;
        setStatus("");
        try {
            if (!selectedSigner?.type) {
                setStatus("Select a registered signer first");
                return;
            }
            const { status: _status, ...config } = selectedSigner;
            await wallet.useSigner(config as any);
            setStatus(`Active signer: ${selectedSigner.type} (${selectedSigner.locator})`);
        } catch (e: any) {
            setStatus(`useSigner error: ${e.message ?? e}`);
        }
    };

    const handleAddSigner = async () => {
        if (!wallet) return;
        setStatus("");
        try {
            let signer: any;
            if (signerType === "device") {
                const descriptor = await createDeviceSigner?.();
                if (!descriptor) throw new Error("createDeviceSigner not available");
                signer = descriptor;
            } else if (signerType === "passkey") {
                const name = fields.name || "passkey";
                const descriptor = await createPasskeySigner?.(name);
                if (!descriptor) throw new Error("createPasskeySigner not available");
                signer = descriptor;
            } else {
                signer = buildSignerConfig(signerType, fields);
            }
            await wallet.addSigner(signer as any);
            setStatus(`Added ${signerType} signer`);
            await loadSigners();
        } catch (e: any) {
            setStatus(`addSigner error: ${e.message ?? e}`);
        }
    };

    const checkRecovery = () => {
        if (!wallet) return;
        setRecoveryNeeded(wallet.needsRecovery());
    };

    const handleRecover = async () => {
        if (!wallet) return;
        setStatus("");
        try {
            await wallet.recover();
            setStatus("Recovery complete");
            setRecoveryNeeded(false);
        } catch (e: any) {
            setStatus(`Recovery error: ${e.message ?? e}`);
        }
    };

    const inputStyle = {
        borderWidth: 1,
        borderColor: "#E5E7EB",
        padding: 12,
        borderRadius: 8,
        marginTop: 8,
        backgroundColor: "#fff",
    } as const;

    const separator = <View style={{ height: 1, backgroundColor: "#E5E7EB", marginVertical: 12 }} />;

    return (
        <View style={{ backgroundColor: "#F7F8FA", borderRadius: 12, padding: 16 }}>
            {/* ── Registered Signers ── */}
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ fontSize: 12, color: "#6B7280", textTransform: "uppercase", fontWeight: "600" }}>
                    Registered Signers
                </Text>
                <TouchableOpacity onPress={loadSigners}>
                    <Text style={{ color: "#13b601", fontWeight: "500" }}>Refresh</Text>
                </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 160, marginTop: 8 }}>
                {/* Recovery signer */}
                {wallet &&
                    (() => {
                        const recovery = (wallet as any).recovery;
                        if (!recovery) return null;
                        const locator = getSignerLocator(recovery);
                        const isSelected = locator === selectedLocator;
                        return (
                            <TouchableOpacity
                                onPress={() => {
                                    setSelectedSigner(recovery);
                                    setSelectedLocator(locator);
                                }}
                                style={{
                                    padding: 8,
                                    marginBottom: 4,
                                    borderRadius: 6,
                                    backgroundColor: isSelected ? "#e8fae6" : "#FFF7ED",
                                    borderWidth: 1,
                                    borderColor: isSelected ? "#13b601" : "#F59E0B",
                                }}
                            >
                                <Text style={{ fontSize: 12, fontWeight: "600" }}>
                                    {signerLabel(recovery)} (recovery)
                                </Text>
                                <Text style={{ fontSize: 10, color: "#6B7280", marginTop: 1 }}>{locator}</Text>
                            </TouchableOpacity>
                        );
                    })()}
                {/* Operational signers */}
                {signers.length === 0 && <Text style={{ fontSize: 12, color: "#6B7280" }}>No signers loaded</Text>}
                {signers.map((s, i) => {
                    const locator = getSignerLocator(s);
                    const isSelected = locator === selectedLocator;
                    return (
                        <TouchableOpacity
                            key={i}
                            onPress={() => selectSigner(s)}
                            style={{
                                padding: 8,
                                marginBottom: 4,
                                borderRadius: 6,
                                backgroundColor: isSelected ? "#e8fae6" : "#fff",
                                borderWidth: 1,
                                borderColor: isSelected ? "#13b601" : "#E5E7EB",
                            }}
                        >
                            <Text style={{ fontSize: 12, fontWeight: "600" }}>{signerLabel(s)}</Text>
                            <Text style={{ fontSize: 10, color: "#6B7280", marginTop: 1 }}>{locator}</Text>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>

            {separator}

            {/* ── Use Signer ── */}
            <Text style={{ fontSize: 12, color: "#6B7280", textTransform: "uppercase", fontWeight: "600" }}>
                Use Signer
            </Text>
            <Text style={{ fontSize: 10, color: "#6B7280", marginTop: 2 }}>
                Tap a registered signer above to select it.
            </Text>
            <Text style={{ ...inputStyle, color: selectedLocator ? "#1A1A1A" : "#9CA3AF" }}>
                {selectedLocator || "No signer selected"}
            </Text>
            <TouchableOpacity
                style={{ backgroundColor: "#13b601", padding: 12, borderRadius: 8, alignItems: "center", marginTop: 8 }}
                onPress={handleUseSigner}
            >
                <Text style={{ color: "#fff", fontWeight: "600" }}>Use Signer</Text>
            </TouchableOpacity>

            {separator}

            {/* ── Add Signer ── */}
            <Text style={{ fontSize: 12, color: "#6B7280", textTransform: "uppercase", fontWeight: "600" }}>
                Add New Signer
            </Text>
            <Text style={{ fontSize: 10, color: "#6B7280", marginTop: 2 }}>
                Create and register a new signer on this wallet.
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                {SIGNER_TYPES.map((t) => (
                    <TouchableOpacity
                        key={t}
                        onPress={() => {
                            setSignerType(t);
                            setFields({});
                        }}
                        style={{
                            paddingHorizontal: 10,
                            paddingVertical: 6,
                            borderRadius: 6,
                            backgroundColor: signerType === t ? "#13b601" : "#fff",
                            borderWidth: 1,
                            borderColor: signerType === t ? "#13b601" : "#E5E7EB",
                        }}
                    >
                        <Text style={{ fontSize: 12, color: signerType === t ? "#fff" : "#1A1A1A", fontWeight: "500" }}>
                            {t}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {signerType === "passkey" && (
                <TextInput
                    style={inputStyle}
                    placeholder="name (e.g. 'My Yubikey')"
                    value={fields.name ?? ""}
                    onChangeText={(v) => setField("name", v)}
                    autoCapitalize="none"
                />
            )}
            {signerType === "external-wallet" && (
                <TextInput
                    style={inputStyle}
                    placeholder="address (e.g. 0x1234...)"
                    value={fields.address ?? ""}
                    onChangeText={(v) => setField("address", v)}
                    autoCapitalize="none"
                />
            )}
            <TouchableOpacity
                style={{
                    backgroundColor: "#fff",
                    padding: 12,
                    borderRadius: 8,
                    alignItems: "center",
                    marginTop: 8,
                    borderWidth: 1,
                    borderColor: "#E5E7EB",
                }}
                onPress={handleAddSigner}
            >
                <Text style={{ fontWeight: "600" }}>Add Signer</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 10, color: "#6B7280", marginTop: 4 }}>
                Triggers recovery (OTP) if needed. Recovery signers: 1 per wallet.
            </Text>

            {separator}

            {/* ── Recovery ── */}
            <Text style={{ fontSize: 12, color: "#6B7280", textTransform: "uppercase", fontWeight: "600" }}>
                Recovery
            </Text>
            <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                <TouchableOpacity
                    style={{
                        flex: 1,
                        backgroundColor: "#fff",
                        padding: 10,
                        borderRadius: 8,
                        alignItems: "center",
                        borderWidth: 1,
                        borderColor: "#E5E7EB",
                    }}
                    onPress={checkRecovery}
                >
                    <Text style={{ fontWeight: "500" }}>Check</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={{ flex: 1, backgroundColor: "#13b601", padding: 10, borderRadius: 8, alignItems: "center" }}
                    onPress={handleRecover}
                >
                    <Text style={{ color: "#fff", fontWeight: "600" }}>Recover</Text>
                </TouchableOpacity>
            </View>
            {recoveryNeeded !== null && (
                <Text style={{ fontSize: 12, color: "#6B7280", marginTop: 8 }}>
                    Needs recovery: {recoveryNeeded ? "Yes" : "No"}
                </Text>
            )}

            {status !== "" && (
                <Text
                    style={{
                        fontSize: 11,
                        fontFamily: "monospace",
                        backgroundColor: "#fff",
                        padding: 8,
                        borderRadius: 6,
                        marginTop: 8,
                    }}
                >
                    {status}
                </Text>
            )}
        </View>
    );
}
