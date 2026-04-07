"use client";

import { useWallet } from "@crossmint/client-sdk-react-ui";
import { useState, useEffect } from "react";
import { privateKeyToAccount } from "viem/accounts";
import { Keypair as SolanaKeypair, type VersionedTransaction } from "@solana/web3.js";
import { Keypair as StellarKeypair } from "@stellar/stellar-sdk";

const SIGNER_TYPES = ["device", "passkey", "external-wallet"] as const;
type SignerType = (typeof SIGNER_TYPES)[number];

function getSignerLocator(s: any): string {
    if (typeof s === "string") return s;
    if (s.signer) return s.signer;
    if (s.locator) return s.locator;
    // Derive locator from config object (e.g. recovery signer)
    if (s.type === "email" && s.email) return `email:${s.email}`;
    if (s.type === "phone" && s.phone) return `phone:${s.phone}`;
    if (s.type === "device") return s.publicKey ? `device:${s.publicKey}` : "device:";
    if (s.type === "passkey" && s.id) return `passkey:${s.id}`;
    if (s.type === "external-wallet" && s.address) return `external-wallet:${s.address}`;
    if (s.type === "server" && s.address) return `server:${s.address}`;
    if (s.type) return s.type;
    return JSON.stringify(s);
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

function locatorToSignerConfig(locator: string): any {
    const [type, ...rest] = locator.split(":");
    const value = rest.join(":");
    switch (type) {
        case "device":
            return { type: "device", locator };
        case "passkey":
            return { type: "passkey", id: value, locator };
        case "email":
            return { type: "email", email: value };
        case "phone":
            return { type: "phone", phone: value };
        case "server":
            return { type: "server", address: value };
        case "external-wallet":
            return { type: "external-wallet", address: value };
        default:
            return { type: locator };
    }
}

function buildExternalWalletSigner(chain: string, privateKey: string): any {
    if (chain === "solana") {
        const secretKey = Uint8Array.from(JSON.parse(privateKey));
        const kp = SolanaKeypair.fromSecretKey(secretKey);
        return {
            type: "external-wallet",
            address: kp.publicKey.toBase58(),
            onSign: async (transaction: VersionedTransaction) => {
                transaction.sign([kp]);
                return transaction;
            },
        };
    }
    if (chain === "stellar") {
        const kp = StellarKeypair.fromSecret(privateKey);
        return {
            type: "external-wallet",
            address: kp.publicKey(),
            onSign: async (message: string) => {
                const signature = kp.sign(Buffer.from(message, "base64"));
                return signature.toString("base64");
            },
        };
    }
    // EVM (default)
    const account = privateKeyToAccount(privateKey as `0x${string}`);
    return {
        type: "external-wallet",
        address: account.address,
        onSign: async (message: string) => {
            return await account.signMessage({ message: { raw: message as `0x${string}` } });
        },
    };
}

export function Permissions() {
    const { wallet, createDeviceSigner, createPasskeySigner } = useWallet();
    const [signers, setSigners] = useState<any[]>([]);
    const [signerType, setSignerType] = useState<SignerType>("device");
    const [fields, setFields] = useState<Record<string, string>>({});
    const [selectedLocator, setSelectedLocator] = useState<string>("");
    const [usePrivateKey, setUsePrivateKey] = useState("");
    const [recoveryNeeded, setRecoveryNeeded] = useState<boolean | null>(null);
    const [status, setStatus] = useState("");

    const setField = (key: string, value: string) => setFields((prev) => ({ ...prev, [key]: value }));

    const loadSigners = async () => {
        if (!wallet) return;
        const res = await wallet.signers();
        setSigners(res ?? []);
    };

    useEffect(() => {
        loadSigners();
    }, [wallet]);

    const selectSigner = (s: any) => {
        const locator = getSignerLocator(s);
        setSelectedLocator(locator);
    };

    const handleUseSigner = async () => {
        if (!wallet || !selectedLocator) return;
        setStatus("");
        try {
            if (selectedLocator.startsWith("external-wallet:") && usePrivateKey) {
                const config = buildExternalWalletSigner(wallet.chain, usePrivateKey);
                await wallet.useSigner(config as any);
                setStatus(`Active signer: external-wallet (${config.address.slice(0, 10)}...)`);
            } else {
                const config = locatorToSignerConfig(selectedLocator);
                await wallet.useSigner(config as any);
                setStatus(`Active signer: ${selectedLocator}`);
            }
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
            } else if (signerType === "external-wallet") {
                if (!fields.privateKey) throw new Error("Private key is required");
                signer = buildExternalWalletSigner(wallet.chain, fields.privateKey);
            } else {
                signer = buildSignerConfig(signerType, fields);
            }
            await wallet.addSigner(signer as any);
            setStatus((prev) =>
                signerType === "external-wallet" ? prev + `\nSigner added to wallet.` : `Added ${signerType} signer`
            );
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

    const divider = <hr style={{ margin: "12px 0", border: "none", borderTop: "1px solid #E5E7EB" }} />;
    const isExternalWalletSelected = selectedLocator.startsWith("external-wallet:");

    return (
        <div className="qs-card qs-card--nested">
            {/* ── Signers ── */}
            <div className="qs-flex qs-flex--between qs-flex--center">
                <p className="qs-label">Signers</p>
                <button className="qs-btn qs-btn--ghost" onClick={loadSigners}>
                    Refresh
                </button>
            </div>
            <div style={{ maxHeight: 200, overflow: "auto" }} className="qs-mt-sm">
                {/* Recovery signer */}
                {wallet &&
                    (() => {
                        const recovery = (wallet as any).recovery;
                        if (!recovery) return null;
                        const locator = getSignerLocator(recovery);
                        const isSelected = locator === selectedLocator;
                        return (
                            <div
                                onClick={() => {
                                    setSelectedLocator(locator);
                                }}
                                style={{
                                    fontSize: 12,
                                    padding: "6px 8px",
                                    marginBottom: 4,
                                    borderRadius: 6,
                                    cursor: "pointer",
                                    background: isSelected ? "#e8fae6" : "#FFF7ED",
                                    border: isSelected ? "1px solid #13b601" : "1px solid #F59E0B",
                                }}
                            >
                                <strong>{signerLabel(recovery)} (recovery)</strong>
                                <div style={{ fontSize: 10, color: "#6B7280", marginTop: 1, wordBreak: "break-all" }}>
                                    {locator}
                                </div>
                            </div>
                        );
                    })()}
                {/* Delegated signers */}
                {signers.length === 0 && (
                    <p className="qs-text-muted" style={{ fontSize: 12 }}>
                        No delegated signers loaded
                    </p>
                )}
                {signers.map((s, i) => {
                    const locator = getSignerLocator(s);
                    const isSelected = locator === selectedLocator;
                    return (
                        <div
                            key={i}
                            onClick={() => selectSigner(s)}
                            style={{
                                fontSize: 12,
                                padding: "6px 8px",
                                marginBottom: 4,
                                borderRadius: 6,
                                cursor: "pointer",
                                background: isSelected ? "#e8fae6" : "#fff",
                                border: isSelected ? "1px solid #13b601" : "1px solid #E5E7EB",
                            }}
                        >
                            <strong>{signerLabel(s)}</strong>
                            <div style={{ fontSize: 10, color: "#6B7280", marginTop: 1, wordBreak: "break-all" }}>
                                {locator}
                            </div>
                        </div>
                    );
                })}
            </div>

            {divider}

            {/* ── Use Signer ── */}
            <p className="qs-label">Use Signer</p>
            <p className="qs-text-muted" style={{ fontSize: 10, marginTop: 2 }}>
                Select a registered signer above, or enter a locator manually.
            </p>
            <input
                className="qs-input qs-mt-sm"
                placeholder="Signer locator (click above or type)"
                value={selectedLocator}
                onChange={(e) => setSelectedLocator(e.target.value)}
            />
            {isExternalWalletSelected && (
                <input
                    type="password"
                    className="qs-input qs-mt-sm"
                    placeholder="Private key (0x...) for this external wallet"
                    value={usePrivateKey}
                    onChange={(e) => setUsePrivateKey(e.target.value)}
                />
            )}
            <button
                className="qs-btn qs-btn--primary qs-btn--full qs-mt-sm"
                onClick={handleUseSigner}
                disabled={!selectedLocator}
            >
                Use Signer
            </button>

            {divider}

            {/* ── Add Signer ── */}
            <p className="qs-label">Add New Signer</p>
            <p className="qs-text-muted" style={{ fontSize: 10, marginTop: 2 }}>
                Create and register a new signer on this wallet.
            </p>
            <select
                className="qs-input qs-mt-sm"
                value={signerType}
                onChange={(e) => {
                    setSignerType(e.target.value as SignerType);
                    setFields({});
                }}
            >
                {SIGNER_TYPES.map((t) => (
                    <option key={t} value={t}>
                        {t}
                    </option>
                ))}
            </select>

            {signerType === "passkey" && (
                <input
                    className="qs-input qs-mt-sm"
                    placeholder="name (e.g. 'My Yubikey')"
                    value={fields.name ?? ""}
                    onChange={(e) => setField("name", e.target.value)}
                />
            )}

            {signerType === "external-wallet" && (
                <input
                    type="password"
                    className="qs-input qs-mt-sm"
                    placeholder="Private key (0x... for EVM, secret for Stellar, [bytes] for Solana)"
                    value={fields.privateKey ?? ""}
                    onChange={(e) => setField("privateKey", e.target.value)}
                />
            )}

            <button className="qs-btn qs-btn--secondary qs-btn--full qs-mt-sm" onClick={handleAddSigner}>
                Add Signer
            </button>

            <p className="qs-text-muted" style={{ fontSize: 10, marginTop: 4 }}>
                Triggers recovery (OTP) if needed. Recovery signers: 1 per wallet.
            </p>

            {divider}

            {/* ── Recovery ── */}
            <p className="qs-label">Recovery</p>
            <div className="qs-flex qs-flex--gap-sm qs-mt-sm">
                <button className="qs-btn qs-btn--secondary" onClick={checkRecovery}>
                    Check
                </button>
                <button className="qs-btn qs-btn--primary" onClick={handleRecover}>
                    Recover
                </button>
            </div>
            {recoveryNeeded !== null && (
                <p className="qs-text-muted qs-mt-sm" style={{ fontSize: 12 }}>
                    Needs recovery: {recoveryNeeded ? "Yes" : "No"}
                </p>
            )}

            {status && (
                <pre
                    className="qs-mt-sm"
                    style={{
                        fontSize: 11,
                        background: "#F7F8FA",
                        padding: 8,
                        borderRadius: 6,
                        wordBreak: "break-all",
                        whiteSpace: "pre-wrap",
                    }}
                >
                    {status}
                </pre>
            )}
        </div>
    );
}
