import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity } from "react-native";
import { MULTI_RECOVERY_CHAINS, RECOVERY_METHOD_TYPES, type RecoveryMethodType } from "../types/recoveryMethod";
import { getSignerLocator, signerLabel } from "../utils/signerUtils";
import { buildRecoveryMethodConfig } from "../utils/recoveryMethodUtils";

const inputStyle = {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    backgroundColor: "#fff",
} as const;

const sectionTitleStyle = { fontSize: 12, color: "#6B7280", textTransform: "uppercase", fontWeight: "600" } as const;
const hintStyle = { fontSize: 10, color: "#6B7280", marginTop: 2 } as const;

const separator = <View style={{ height: 1, backgroundColor: "#E5E7EB", marginVertical: 12 }} />;

interface RecoveryMethodsProps {
    wallet: any;
    /** Creates a wallet with the given recovery methods; the playground shows the result via the wallet provider. */
    createWallet?: (args: { chain: string; recoveryMethods: any[]; alias?: string }) => Promise<any>;
    createPasskeySigner?: (name: string) => Promise<any>;
    /** Builds an external-wallet signer with `onSign` from a private key, needed to authorize with that method. */
    buildExternalWalletSignerFn?: (chain: string, privateKey: string) => any;
}

function TypePicker({ value, onChange }: { value: RecoveryMethodType; onChange: (type: RecoveryMethodType) => void }) {
    return (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
            {RECOVERY_METHOD_TYPES.map((t) => (
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

function TypeFields({
    type,
    fields,
    setField,
}: {
    type: RecoveryMethodType;
    fields: Record<string, string>;
    setField: (key: string, value: string) => void;
}) {
    switch (type) {
        case "email":
            return (
                <TextInput
                    style={inputStyle}
                    placeholder="email (blank = logged-in user)"
                    value={fields.email ?? ""}
                    onChangeText={(v) => setField("email", v)}
                    autoCapitalize="none"
                />
            );
        case "phone":
            return (
                <TextInput
                    style={inputStyle}
                    placeholder="phone (e.g. +15551234567)"
                    value={fields.phone ?? ""}
                    onChangeText={(v) => setField("phone", v)}
                    autoCapitalize="none"
                />
            );
        case "passkey":
            return (
                <TextInput
                    style={inputStyle}
                    placeholder="name (e.g. 'My Yubikey')"
                    value={fields.name ?? ""}
                    onChangeText={(v) => setField("name", v)}
                    autoCapitalize="none"
                />
            );
        case "external-wallet":
            return (
                <TextInput
                    style={inputStyle}
                    placeholder="address"
                    value={fields.address ?? ""}
                    onChangeText={(v) => setField("address", v)}
                    autoCapitalize="none"
                />
            );
        case "server":
            return (
                <TextInput
                    style={inputStyle}
                    secureTextEntry
                    placeholder="signer secret (64 hex or xmsk1_...)"
                    value={fields.secret ?? ""}
                    onChangeText={(v) => setField("secret", v)}
                    autoCapitalize="none"
                />
            );
    }
}

export function RecoveryMethods({
    wallet,
    createWallet,
    createPasskeySigner,
    buildExternalWalletSignerFn,
}: RecoveryMethodsProps) {
    const [selectedLocator, setSelectedLocator] = useState("");
    const [authPrivateKey, setAuthPrivateKey] = useState("");
    const [authSecret, setAuthSecret] = useState("");

    const [addType, setAddType] = useState<RecoveryMethodType>("email");
    const [addFields, setAddFields] = useState<Record<string, string>>({});

    const [createChain, setCreateChain] = useState<string>(MULTI_RECOVERY_CHAINS[0]);
    const [createAlias, setCreateAlias] = useState("");
    const [createType, setCreateType] = useState<RecoveryMethodType>("email");
    const [createFields, setCreateFields] = useState<Record<string, string>>({});
    const [pendingMethods, setPendingMethods] = useState<any[]>([]);

    const [busy, setBusy] = useState(false);
    const [status, setStatus] = useState("");

    const recoveryMethods: any[] = wallet?.recoveryMethods ?? [];
    const selected = recoveryMethods.find((m) => getSignerLocator(m) === selectedLocator);
    const supportsManagement = wallet != null && (MULTI_RECOVERY_CHAINS as readonly string[]).includes(wallet.chain);

    const run = async (label: string, action: () => Promise<string>) => {
        setStatus("");
        setBusy(true);
        try {
            setStatus(await action());
        } catch (e: any) {
            setStatus(`${label} error: ${e.message ?? e}`);
        } finally {
            setBusy(false);
        }
    };

    /** Resolves the fuller config the SDK needs to operate a method (onSign / secret) from the selected entry. */
    const authorizingConfig = () => {
        if (selected == null) throw new Error("Select a recovery method first");
        if (selected.type === "external-wallet") {
            if (buildExternalWalletSignerFn == null || authPrivateKey === "") {
                throw new Error("An external-wallet recovery method needs its private key to authorize");
            }
            return buildExternalWalletSignerFn(wallet.chain, authPrivateKey);
        }
        if (selected.type === "server") {
            if (authSecret === "") throw new Error("A server recovery method needs its secret to authorize");
            return { type: "server", secret: authSecret };
        }
        return selected;
    };

    const useRecoveryMethod = () =>
        run("useRecoveryMethod", async () => {
            await wallet.useRecoveryMethod(authorizingConfig());
            return `Authorizing recovery method: ${selectedLocator}`;
        });

    const removeRecoveryMethod = () =>
        run("removeRecoveryMethod", async () => {
            if (selected == null) throw new Error("Select a recovery method first");
            const { transactionId } = await wallet.removeRecoveryMethod(selected);
            setSelectedLocator("");
            return `Removed ${selectedLocator} (tx ${transactionId})`;
        });

    const buildMethod = async (type: RecoveryMethodType, fields: Record<string, string>) => {
        if (type === "passkey" && createPasskeySigner != null) {
            return await createPasskeySigner(fields.name || "recovery-passkey");
        }
        return buildRecoveryMethodConfig(type, fields);
    };

    const addRecoveryMethod = () =>
        run("addRecoveryMethod", async () => {
            const method = await buildMethod(addType, addFields);
            const { transactionId } = await wallet.addRecoveryMethod(method);
            setAddFields({});
            return `Added ${signerLabel(method)} (tx ${transactionId})`;
        });

    const queueMethod = () =>
        run("build method", async () => {
            const method = await buildMethod(createType, createFields);
            setPendingMethods((prev) => [...prev, method]);
            setCreateFields({});
            return `Queued ${signerLabel(method)} for the new wallet`;
        });

    const createWalletWithMethods = () =>
        run("createWallet", async () => {
            if (createWallet == null) throw new Error("createWallet not available");
            if (pendingMethods.length === 0) throw new Error("Queue at least one recovery method");
            const created = await createWallet({
                chain: createChain,
                recoveryMethods: pendingMethods,
                ...(createAlias !== "" && { alias: createAlias }),
            });
            setPendingMethods([]);
            return `Created ${createChain} wallet ${created?.address ?? ""} with ${pendingMethods.length} recovery method(s)`;
        });

    return (
        <View style={{ backgroundColor: "#F7F8FA", borderRadius: 12, padding: 16 }}>
            {/* ── Current recovery methods ── */}
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
                            onPress={() => setSelectedLocator(locator)}
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
            {selected?.type === "external-wallet" && buildExternalWalletSignerFn != null && (
                <TextInput
                    style={inputStyle}
                    secureTextEntry
                    placeholder="Private key for this external wallet (to authorize with it)"
                    value={authPrivateKey}
                    onChangeText={setAuthPrivateKey}
                    autoCapitalize="none"
                />
            )}
            {selected?.type === "server" && (
                <TextInput
                    style={inputStyle}
                    secureTextEntry
                    placeholder="Signer secret for this server signer (to authorize with it)"
                    value={authSecret}
                    onChangeText={setAuthSecret}
                    autoCapitalize="none"
                />
            )}
            <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                <TouchableOpacity
                    testID="recovery-methods-use-button"
                    disabled={busy || selected == null}
                    style={{
                        flex: 1,
                        backgroundColor: "#13b601",
                        padding: 10,
                        borderRadius: 8,
                        alignItems: "center",
                        opacity: busy || selected == null ? 0.5 : 1,
                    }}
                    onPress={useRecoveryMethod}
                >
                    <Text style={{ color: "#fff", fontWeight: "600" }}>Authorize with</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    testID="recovery-methods-remove-button"
                    disabled={busy || selected == null || !supportsManagement}
                    style={{
                        flex: 1,
                        backgroundColor: "#fff",
                        padding: 10,
                        borderRadius: 8,
                        alignItems: "center",
                        borderWidth: 1,
                        borderColor: "#EF4444",
                        opacity: busy || selected == null || !supportsManagement ? 0.5 : 1,
                    }}
                    onPress={removeRecoveryMethod}
                >
                    <Text style={{ color: "#EF4444", fontWeight: "600" }}>Remove</Text>
                </TouchableOpacity>
            </View>
            <Text style={{ ...hintStyle, marginTop: 4 }}>
                "Authorize with" calls useRecoveryMethod: it picks which recovery method approves addSigner /
                removeSigner / addRecoveryMethod / removeRecoveryMethod without changing the active signer.
            </Text>

            {separator}

            {/* ── Add recovery method ── */}
            <Text style={sectionTitleStyle}>Add Recovery Method</Text>
            <Text style={hintStyle}>
                {supportsManagement
                    ? "Approved by the selected recovery method (or the wallet's only one)."
                    : "Only Solana and Stellar wallets support adding or removing recovery methods."}
            </Text>
            <TypePicker
                value={addType}
                onChange={(t) => {
                    setAddType(t);
                    setAddFields({});
                }}
            />
            <TypeFields
                type={addType}
                fields={addFields}
                setField={(k, v) => setAddFields((prev) => ({ ...prev, [k]: v }))}
            />
            <TouchableOpacity
                testID="recovery-methods-add-button"
                disabled={busy || !supportsManagement}
                style={{
                    backgroundColor: "#fff",
                    padding: 12,
                    borderRadius: 8,
                    alignItems: "center",
                    marginTop: 8,
                    borderWidth: 1,
                    borderColor: "#E5E7EB",
                    opacity: busy || !supportsManagement ? 0.5 : 1,
                }}
                onPress={addRecoveryMethod}
            >
                <Text style={{ fontWeight: "600" }}>Add Recovery Method</Text>
            </TouchableOpacity>

            {separator}

            {/* ── Create wallet with several recovery methods ── */}
            <Text style={sectionTitleStyle}>Create Wallet With Multiple Recovery Methods</Text>
            <Text style={hintStyle}>
                Queue recovery methods, then create the wallet. Each one can authorize on its own.
            </Text>
            <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                {MULTI_RECOVERY_CHAINS.map((chain) => (
                    <TouchableOpacity
                        key={chain}
                        testID={`recovery-methods-chain-${chain}`}
                        onPress={() => setCreateChain(chain)}
                        style={{
                            flex: 1,
                            padding: 10,
                            borderRadius: 8,
                            alignItems: "center",
                            backgroundColor: createChain === chain ? "#13b601" : "#fff",
                            borderWidth: 1,
                            borderColor: createChain === chain ? "#13b601" : "#E5E7EB",
                        }}
                    >
                        <Text
                            style={{
                                color: createChain === chain ? "#fff" : "#1A1A1A",
                                fontWeight: "500",
                                fontSize: 13,
                            }}
                        >
                            {chain}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
            <TextInput
                style={inputStyle}
                placeholder="alias (optional, lets one user hold several wallets per chain)"
                value={createAlias}
                onChangeText={setCreateAlias}
                autoCapitalize="none"
            />
            <TypePicker
                value={createType}
                onChange={(t) => {
                    setCreateType(t);
                    setCreateFields({});
                }}
            />
            <TypeFields
                type={createType}
                fields={createFields}
                setField={(k, v) => setCreateFields((prev) => ({ ...prev, [k]: v }))}
            />
            <TouchableOpacity
                testID="recovery-methods-queue-button"
                disabled={busy}
                style={{
                    backgroundColor: "#fff",
                    padding: 10,
                    borderRadius: 8,
                    alignItems: "center",
                    marginTop: 8,
                    borderWidth: 1,
                    borderColor: "#E5E7EB",
                    opacity: busy ? 0.5 : 1,
                }}
                onPress={queueMethod}
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
                            <TouchableOpacity
                                onPress={() => setPendingMethods((prev) => prev.filter((_, j) => j !== i))}
                            >
                                <Text style={{ fontSize: 12, color: "#EF4444" }}>remove</Text>
                            </TouchableOpacity>
                        </View>
                    ))}
                </View>
            )}
            <TouchableOpacity
                testID="recovery-methods-create-button"
                disabled={busy || pendingMethods.length === 0}
                style={{
                    backgroundColor: "#13b601",
                    padding: 12,
                    borderRadius: 8,
                    alignItems: "center",
                    marginTop: 8,
                    opacity: busy || pendingMethods.length === 0 ? 0.5 : 1,
                }}
                onPress={createWalletWithMethods}
            >
                <Text style={{ color: "#fff", fontWeight: "600" }}>
                    Create Wallet ({pendingMethods.length} recovery method{pendingMethods.length === 1 ? "" : "s"})
                </Text>
            </TouchableOpacity>

            {status !== "" && (
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
                    {status}
                </Text>
            )}
        </View>
    );
}
