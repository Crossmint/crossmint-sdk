import { useState } from "react";
import { MULTI_RECOVERY_CHAINS, RECOVERY_METHOD_TYPES, type RecoveryMethodType } from "../../types/recoveryMethod";
import { getSignerLocator, signerLabel } from "../../utils/signerUtils";
import { buildRecoveryMethodConfig } from "../../utils/recoveryMethodUtils";

export interface RecoveryMethodActionsArgs {
    wallet: any;
    createWallet?: (args: { chain: string; recoveryMethods: any[]; alias?: string }) => Promise<any>;
    createPasskeySigner?: (name: string) => Promise<any>;
    buildExternalWalletSignerFn?: (chain: string, privateKey: string) => any;
}

/** State + wallet operations behind the RecoveryMethods panel (useRecoveryMethod / add / remove / create). */
export function useRecoveryMethodActions({
    wallet,
    createWallet,
    createPasskeySigner,
    buildExternalWalletSignerFn,
}: RecoveryMethodActionsArgs) {
    const [selectedLocator, setSelectedLocator] = useState("");
    const [authPrivateKey, setAuthPrivateKey] = useState("");
    const [authSecret, setAuthSecret] = useState("");
    const [pendingMethods, setPendingMethods] = useState<any[]>([]);
    const [busy, setBusy] = useState(false);
    const [status, setStatus] = useState("");

    const recoveryMethods: any[] = wallet?.recoveryMethods ?? [];
    const selected = recoveryMethods.find((m) => getSignerLocator(m) === selectedLocator);
    const supportsManagement = wallet != null && (MULTI_RECOVERY_CHAINS as readonly string[]).includes(wallet.chain);
    const canAuthorizeExternalWallet = buildExternalWalletSignerFn != null;
    /** Passkeys are only offered when the platform can create them (the RN provider cannot). */
    const availableTypes: readonly RecoveryMethodType[] =
        createPasskeySigner != null ? RECOVERY_METHOD_TYPES : RECOVERY_METHOD_TYPES.filter((t) => t !== "passkey");

    const run = async (label: string, action: () => Promise<string>) => {
        setStatus("");
        setBusy(true);
        try {
            setStatus(await action());
            return true;
        } catch (e: any) {
            setStatus(`${label} error: ${e.message ?? e}`);
            return false;
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

    const buildMethod = async (type: RecoveryMethodType, fields: Record<string, string>) => {
        if (type === "passkey") {
            if (createPasskeySigner == null) throw new Error("Passkeys are not supported on this platform");
            return await createPasskeySigner(fields.name || "recovery-passkey");
        }
        return buildRecoveryMethodConfig(type, fields);
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

    const addRecoveryMethod = (type: RecoveryMethodType, fields: Record<string, string>) =>
        run("addRecoveryMethod", async () => {
            const method = await buildMethod(type, fields);
            const { transactionId } = await wallet.addRecoveryMethod(method);
            return `Added ${signerLabel(method)} (tx ${transactionId})`;
        });

    const queueMethod = (type: RecoveryMethodType, fields: Record<string, string>) =>
        run("build method", async () => {
            const method = await buildMethod(type, fields);
            setPendingMethods((prev) => [...prev, method]);
            return `Queued ${signerLabel(method)} for the new wallet`;
        });

    const unqueueMethod = (index: number) => setPendingMethods((prev) => prev.filter((_, j) => j !== index));

    const createWalletWithMethods = (chain: string, alias: string) =>
        run("createWallet", async () => {
            if (createWallet == null) throw new Error("createWallet not available");
            if (pendingMethods.length === 0) throw new Error("Queue at least one recovery method");
            const created = await createWallet({
                chain,
                recoveryMethods: pendingMethods,
                ...(alias !== "" && { alias }),
            });
            setPendingMethods([]);
            return `Created ${chain} wallet ${created?.address ?? ""} with ${pendingMethods.length} recovery method(s)`;
        });

    return {
        recoveryMethods,
        selected,
        selectedLocator,
        setSelectedLocator,
        authPrivateKey,
        setAuthPrivateKey,
        authSecret,
        setAuthSecret,
        canAuthorizeExternalWallet,
        supportsManagement,
        availableTypes,
        pendingMethods,
        busy,
        status,
        useRecoveryMethod,
        removeRecoveryMethod,
        addRecoveryMethod,
        queueMethod,
        unqueueMethod,
        createWalletWithMethods,
    };
}
