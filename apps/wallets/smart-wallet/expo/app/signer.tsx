import { useState, useEffect } from "react";
import { View, Text, Button, TextInput, StyleSheet, ScrollView, ActivityIndicator, Alert } from "react-native";
import { useCrossmintAuth, useWallet, useWalletEmailSigner } from "@crossmint/client-sdk-react-native-ui";
import { PublicKey, TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import { createMemoInstruction } from "@solana/spl-memo";
import { SolanaWallet } from "@crossmint/wallets-sdk";

export default function SignerScreen() {
    const { status, wallet, clearWallet, error: walletError, getOrCreateWallet } = useWallet();
    const { user } = useCrossmintAuth();
    const { needsAuth, sendEmailWithOtp, verifyOtp } = useWalletEmailSigner();

    const [otp, setOtp] = useState("");
    const [txHash, setTxHash] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isInOtpFlow, setIsInOtpFlow] = useState(false);
    const [uiError, setUiError] = useState<string | null>(null);

    useEffect(() => {
        if (needsAuth && !isInOtpFlow) {
            setIsInOtpFlow(true);
        }
    }, [needsAuth, isInOtpFlow]);

    const handleAction = async (action: () => Promise<any>) => {
        setIsLoading(true);
        setUiError(null);
        setTxHash(null);
        try {
            await action();
        } catch (e: any) {
            console.error(e);
            const message = e.message || "An unexpected error occurred.";
            setUiError(message);
            Alert.alert("Error", message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateOrLoadSigner = async () => {
        if (user?.email == null) {
            Alert.alert("Error", "User email is not available.");
            return;
        }
        await handleAction(async () => {
            const { startedCreation, reason } = await getOrCreateWallet({
                chain: "solana",
                signer: {
                    type: "email",
                    email: user?.email,
                },
            });
            if (!startedCreation && reason) {
                throw new Error(reason);
            }
        });
    };

    const handleSendOtpEmail = async () => {
        const email = user?.email;
        if (typeof email !== "string") {
            Alert.alert("Error", "User email is not available.");
            return;
        }
        setIsInOtpFlow(true);
        await handleAction(() => sendEmailWithOtp(email));
    };

    const handleVerifyOtpInput = async () => {
        if (!otp || !verifyOtp) {
            Alert.alert("Error", "Please enter the OTP and ensure email signer is available.");
            return;
        }
        await handleAction(async () => {
            await verifyOtp(otp);
            setOtp("");
            setIsInOtpFlow(false);
        });
    };

    const handleSendTransaction = async () => {
        if (status !== "loaded" || wallet == null) {
            Alert.alert("Error", "Wallet is not loaded or is not a Solana smart wallet.");
            return;
        }

        await handleAction(async () => {
            const transaction = new VersionedTransaction(
                new TransactionMessage({
                    payerKey: new PublicKey(wallet.address),
                    recentBlockhash: "11111111111111111111111111111111",
                    instructions: [createMemoInstruction(`Hello from Crossmint Smart Wallet! ${Date.now()}`)],
                }).compileToV0Message()
            );
            const solanaWallet = SolanaWallet.from(wallet as SolanaWallet);
            const signature = await solanaWallet.sendTransaction({ transaction });
            if (signature) {
                setTxHash(signature);
                Alert.alert("Success", `Transaction Sent: ${signature}`);
            } else {
                setUiError("Transaction sending did not return a signature.");
                Alert.alert("Info", "Transaction sent, but no signature was immediately returned.");
            }
        });
    };

    const canCreateLoad = !isLoading && user?.email != null && wallet == null;
    const canSendTx = !isLoading && status === "loaded";
    const canClear = !isLoading && status !== "not-loaded";

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
            <View style={styles.statusSection}>
                <Text>Auth Status: {status}</Text>
                <Text>Needs OTP Auth: {needsAuth ? "Yes" : "No"}</Text>
                {walletError && <Text style={styles.errorText}>Wallet Error: {walletError}</Text>}
                {uiError && <Text style={styles.errorText}>Last Action Error: {uiError}</Text>}
                <Text>Wallet Address: {wallet?.address ?? "Not Loaded"}</Text>
                {txHash && <Text>Last Tx Hash: {txHash}</Text>}
                {isLoading && <ActivityIndicator size="large" color="#0000ff" style={{ marginTop: 10 }} />}
            </View>

            <View style={styles.section}>
                <Button title="1. Create / Load Signer" onPress={handleCreateOrLoadSigner} disabled={!canCreateLoad} />
            </View>

            {isInOtpFlow && (
                <View style={styles.section}>
                    <Button title="Send OTP Email" onPress={handleSendOtpEmail} disabled={user?.email == null} />
                    <TextInput
                        placeholder="Enter OTP from Email"
                        value={otp}
                        onChangeText={setOtp}
                        style={styles.input}
                        keyboardType="numeric"
                        autoCapitalize="none"
                    />
                    <Button title="Verify OTP" onPress={handleVerifyOtpInput} disabled={!otp} />
                </View>
            )}

            <View style={styles.section}>
                <Button title="Send Memo Transaction" onPress={handleSendTransaction} disabled={!canSendTx} />
            </View>

            <View style={styles.section}>
                <Button
                    title="Clear Wallet State"
                    onPress={() => handleAction(async () => clearWallet())}
                    disabled={!canClear}
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
    input: { borderWidth: 1, borderColor: "#ccc", padding: 10, marginBottom: 10, borderRadius: 5 },
    errorText: { color: "red", marginTop: 5 },
});
