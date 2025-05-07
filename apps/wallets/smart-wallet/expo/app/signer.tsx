import { useState } from "react";
import { View, Text, Button, TextInput, StyleSheet, ScrollView, ActivityIndicator, Alert } from "react-native";
import {
    useWallet as useBaseWallet,
    useCrossmintAuth,
    type ReactNativeWalletContextState,
} from "@crossmint/client-sdk-react-native-ui";
import { TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import { createMemoInstruction } from "@solana/spl-memo";

export default function SignerScreen() {
    const {
        status,
        wallet,
        type,
        clearWallet,
        error: walletError,
        experimental_needsAuth,
        experimental_createRecoveryKeySigner,
        experimental_sendEmailWithOtp,
        experimental_verifyOtp,
    } = useBaseWallet() as ReactNativeWalletContextState;

    const { user } = useCrossmintAuth();

    const [otp, setOtp] = useState("");
    const [txHash, setTxHash] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [pendingOtpInput, setPendingOtpInput] = useState<boolean>(false);
    const [uiError, setUiError] = useState<string | null>(null);

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

    const handleCreateOrLoadSigner = () => {
        if (user?.email == null) {
            Alert.alert("Error", "User email is not available.");
            return;
        }
        handleAction(() => experimental_createRecoveryKeySigner(user.email!));
    };

    const handleSendOtpEmail = () => {
        if (user?.email == null) {
            Alert.alert("Error", "User email is not available.");
            return;
        }
        setPendingOtpInput(true);
        handleAction(() => experimental_sendEmailWithOtp(user.email!));
    };

    const handleVerifyOtpInput = () => {
        if (!otp) {
            Alert.alert("Error", "Please enter the OTP.");
            return;
        }
        handleAction(async () => {
            const signer = await experimental_verifyOtp(otp);
            if (signer) {
                Alert.alert("Success", `Signer verified: ${signer.address}`);
                setOtp("");
            }
        });
    };

    const handleSendTransaction = () => {
        if (status !== "loaded" || wallet == null || type !== "solana-smart-wallet") {
            Alert.alert("Error", "Wallet is not loaded or is not a Solana smart wallet.");
            return;
        }
        if (experimental_needsAuth) {
            Alert.alert("Error", "OTP verification required before sending transactions.");
            return;
        }

        handleAction(async () => {
            const transaction = new VersionedTransaction(
                new TransactionMessage({
                    payerKey: wallet.publicKey,
                    recentBlockhash: "11111111111111111111111111111111",
                    instructions: [createMemoInstruction(`Hello from Crossmint Smart Wallet! ${Date.now()}`)],
                }).compileToV0Message()
            );
            const signature = await wallet.sendTransaction({ transaction });
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
    const canSendEmail = !isLoading && experimental_needsAuth && user?.email != null;
    const canVerifyOtp = !isLoading && pendingOtpInput;
    const canSendTx = !isLoading && status === "loaded" && type === "solana-smart-wallet" && !experimental_needsAuth;
    const canClear = !isLoading && status !== "not-loaded";

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
            <View style={styles.statusSection}>
                <Text>Auth Status: {status}</Text>
                <Text>Needs OTP Auth: {experimental_needsAuth ? "Yes" : "No"}</Text>
                {walletError && <Text style={styles.errorText}>Wallet Error: {walletError}</Text>}
                {uiError && <Text style={styles.errorText}>Last Action Error: {uiError}</Text>}
                <Text>Wallet Address: {wallet?.address ?? "Not Loaded"}</Text>
                {txHash && <Text>Last Tx Hash: {txHash}</Text>}
                {isLoading && <ActivityIndicator size="large" color="#0000ff" style={{ marginTop: 10 }} />}
            </View>

            <View style={styles.section}>
                <Button title="1. Create / Load Signer" onPress={handleCreateOrLoadSigner} disabled={!canCreateLoad} />
            </View>

            <View style={styles.section}>
                <Button title="2. Send Email OTP" onPress={handleSendOtpEmail} disabled={!canSendEmail} />
            </View>

            <View style={styles.section}>
                <TextInput
                    placeholder="Enter OTP from Email"
                    value={otp}
                    onChangeText={setOtp}
                    style={styles.input}
                    editable={canVerifyOtp}
                    keyboardType="numeric"
                    autoCapitalize="none"
                />
                <Button title="3. Verify OTP" onPress={handleVerifyOtpInput} disabled={!canVerifyOtp || !otp} />
            </View>

            <View style={styles.section}>
                <Button title="4. Send Memo Transaction" onPress={handleSendTransaction} disabled={!canSendTx} />
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
