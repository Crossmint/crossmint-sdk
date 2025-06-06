import { useState, useEffect } from "react";
import { View, Text, Button, TextInput, StyleSheet, ScrollView, ActivityIndicator, Alert } from "react-native";
import { useCrossmint, useWallet, useWalletEmailSigner } from "@crossmint/client-sdk-react-native-ui";
import { useRouter } from "expo-router";

export default function SignerScreen() {
    const { crossmint } = useCrossmint();
    const loggedInUserEmail = crossmint.experimental_customAuth?.email ?? null;
    const { status: walletStatus, wallet, clearWallet, error: walletError } = useWallet();
    const { needsAuth, sendEmailWithOtp, verifyOtp } = useWalletEmailSigner();
    const router = useRouter();

    const [otp, setOtp] = useState("");
    const [txHash, setTxHash] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isInOtpFlow, setIsInOtpFlow] = useState(false);
    const [uiError, setUiError] = useState<string | null>(null);
    const [recipientAddress, setRecipientAddress] = useState("");
    const [amount, setAmount] = useState<string>("");
    const [usdcBalance, setUsdcBalance] = useState<string | null>(null);

    useEffect(() => {
        if (needsAuth && !isInOtpFlow) {
            setIsInOtpFlow(true);
        }
    }, [needsAuth, isInOtpFlow]);

    useEffect(() => {
        async function fetchBalances() {
            if (wallet == null) {
                return;
            }
            try {
                const balances = await wallet.balances(["usdc"]);
                setUsdcBalance(balances[0].amount);
            } catch (error) {
                console.log("Error fetching wallet balances:", error);
            }
        }
        fetchBalances();
    }, [wallet]);

    const handleAction = async (action: () => Promise<any> | void) => {
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

    const handleSendOtpEmail = async () => {
        if (typeof loggedInUserEmail !== "string") {
            Alert.alert("Error", "User email is not available.");
            return;
        }
        setIsInOtpFlow(true);
        await handleAction(() => sendEmailWithOtp());
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

    async function sendUSDC() {
        if (walletStatus !== "loaded" || wallet == null) {
            Alert.alert("Error", "Wallet is not loaded or is not a Solana smart wallet.");
            return;
        }
        setIsLoading(true);
        try {
            const txHash = await wallet.send(recipientAddress, "usdc", amount);
            console.log(`Sent ${amount} USDC to ${recipientAddress}. Tx Hash: ${txHash}`);
            setTxHash(txHash);
            setRecipientAddress("");
            setAmount("");
        } catch (error) {
            console.log("error sending usdc", error);
        } finally {
            setIsLoading(false);
        }
    }

    const canClear = !isLoading && walletStatus !== "not-loaded";

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
            <View style={styles.statusSection}>
                <Text>Auth Status: {walletStatus}</Text>
                <Text>Needs OTP Auth: {needsAuth ? "Yes" : "No"}</Text>
                {walletError && <Text style={styles.errorText}>Wallet Error: {walletError}</Text>}
                {uiError && <Text style={styles.errorText}>Last Action Error: {uiError}</Text>}
                <Text>Wallet Address: {wallet?.address ?? "Not Loaded"}</Text>
                <Text>USDC Balance: {usdcBalance}</Text>
                {txHash && <Text>Last Tx Hash: {txHash}</Text>}
                {isLoading && <ActivityIndicator size="large" color="#0000ff" style={{ marginTop: 10 }} />}
            </View>

            {isInOtpFlow && (
                <View style={styles.section}>
                    <Button title="Send OTP Email" onPress={handleSendOtpEmail} disabled={loggedInUserEmail == null} />
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
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10, width: "100%" }}>
                    <View style={{ flex: 1 }}>
                        <Text>Send USDC to</Text>
                        <TextInput
                            placeholder="Enter address"
                            value={recipientAddress}
                            onChangeText={setRecipientAddress}
                            style={{ borderWidth: 1, padding: 5, borderRadius: 5 }}
                        />
                    </View>
                    <View style={{ width: 100 }}>
                        <Text>Amount</Text>
                        <TextInput
                            placeholder="Amount"
                            value={amount}
                            onChangeText={setAmount}
                            style={{ borderWidth: 1, padding: 5, borderRadius: 5 }}
                        />
                    </View>
                </View>
                <Button title="Send USDC" onPress={sendUSDC} disabled={isLoading || amount === ""} />
            </View>

            <View style={styles.section}>
                <Button
                    title="Clear Wallet State"
                    onPress={() =>
                        handleAction(() => {
                            clearWallet();
                            router.replace("/");
                        })
                    }
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
