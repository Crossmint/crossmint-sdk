import { useEffect, useState } from "react";
import { View, Text, Button, TextInput, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import { useWallet, useCrossmintAuth } from "@crossmint/client-sdk-react-native-ui";
import { TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import { createMemoInstruction } from "@solana/spl-memo";

export default function SignerScreen() {
    const {
        status,
        wallet,
        type,
        getOrCreateWallet,
        clearWallet,
        error: walletError,
        isWebViewReady,
        recoverySigner,
        experimental_createRecoveryKeySigner,
        experimental_validateEmailOtp,
    } = useWallet();

    const { user } = useCrossmintAuth();

    const [otp, setOtp] = useState("");
    const [txHash, setTxHash] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [authId, setAuthId] = useState<string | null>(null);

    useEffect(() => {
        if (user?.email != null) {
            const id = `email:${user.email}`;
            setAuthId(id);
        } else if (user?.id != null) {
            setAuthId(user.id);
        }
    }, [user]);

    const handleCreateSigner = async () => {
        if (authId == null) {
            return;
        }
        setIsLoading(true);
        try {
            await experimental_createRecoveryKeySigner(authId);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSendOtp = async () => {
        setIsLoading(true);
        try {
            const address = await experimental_validateEmailOtp(otp);
            if (address != null) {
                console.log(`OTP validation successful. Signer address: ${address}`);
            } else {
                console.log("OTP validation failed or address not received.");
            }
            setOtp("");
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleGetOrCreateWallet = async () => {
        if (recoverySigner == null) {
            return;
        }
        setIsLoading(true);
        try {
            await getOrCreateWallet({
                type: "solana-smart-wallet",
                args: {
                    adminSigner: recoverySigner,
                },
            });
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSendTransaction = async () => {
        if (status !== "loaded" || wallet == null || type !== "solana-smart-wallet") {
            return;
        }
        setIsLoading(true);
        try {
            const transaction = new VersionedTransaction(
                new TransactionMessage({
                    payerKey: wallet.publicKey,
                    recentBlockhash: "11111111111111111111111111111111",
                    instructions: [createMemoInstruction("Hello, Solana!")],
                }).compileToV0Message()
            );
            const signature = await wallet.sendTransaction({ transaction });
            setTxHash(signature ?? null);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
            <View style={styles.statusSection}>
                <Text>Wallet Status: {status}</Text>
                {walletError && <Text style={styles.errorText}>Wallet Error: {walletError}</Text>}
                <Text>WebView Ready: {isWebViewReady ? "Yes" : "No"}</Text>
                <Text>Recovery Signer: {recoverySigner?.address ?? "Not Available"}</Text>
                <Text>Wallet Address: {wallet?.address ?? "Not Loaded"}</Text>
                {txHash && <Text>Last Tx Hash: {txHash}</Text>}
                {isLoading && <ActivityIndicator size="small" color="#0000ff" />}
            </View>

            <View style={styles.section}>
                <Button
                    title="1. Create/Load Recovery Signer"
                    onPress={handleCreateSigner}
                    disabled={isLoading || !isWebViewReady || !authId  || recoverySigner != null}
                />
            </View>

            <View style={styles.section}>
                <TextInput
                    placeholder="Enter OTP"
                    value={otp}
                    onChangeText={setOtp}
                    style={styles.input}
                    editable={!isLoading && isWebViewReady}
                />
                <Button
                    title="2. Validate OTP"
                    onPress={handleSendOtp}
                    disabled={isLoading || !isWebViewReady || !otp || recoverySigner != null}
                />
            </View>

            <View style={styles.section}>
                <Button
                    title="3. Get or Create Wallet"
                    onPress={handleGetOrCreateWallet}
                    disabled={isLoading || status === "in-progress" || recoverySigner != null}
                />
            </View>

            <View style={styles.section}>
                <Button
                    title="4. Send Memo Transaction"
                    onPress={handleSendTransaction}
                    disabled={isLoading || status !== "loaded" || type !== "solana-smart-wallet"}
                />
            </View>

            <View style={styles.section}>
                <Button
                    title="Clear Wallet State"
                    onPress={clearWallet}
                    disabled={isLoading || status === "not-loaded"}
                />
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    contentContainer: { padding: 16 },
    section: { marginBottom: 20, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#eee" },
    statusSection: { marginBottom: 20, padding: 10, backgroundColor: "#f0f0f0", borderRadius: 5 },
    logsSection: { marginTop: 20 },
    logsTitle: { fontWeight: "bold", marginBottom: 5 },
    logEntry: { fontSize: 12, color: "#555", marginBottom: 3 },
    input: { borderWidth: 1, borderColor: "#ccc", padding: 10, marginBottom: 10, borderRadius: 5 },
    errorText: { color: "red" },
});
