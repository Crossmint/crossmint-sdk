import {
    useCrossmintAuth,
    useWallet,
    useWalletEmailSigner,
    useCrossmint,
    type Balances,
} from "@crossmint/client-sdk-react-native-ui";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Button, Text, View, TextInput, StyleSheet, ScrollView, Alert } from "react-native";
import * as Linking from "expo-linking";
import { fundUSDC } from "@/utils/usdcFaucet";

export default function Index() {
    const { loginWithOAuth, user, logout, createAuthSession, jwt } = useCrossmintAuth();
    const { experimental_customAuth } = useCrossmint();
    const loggedInUserEmail = experimental_customAuth?.email ?? null;
    const { wallet, getOrCreateWallet, status: walletStatus } = useWallet();
    const { needsAuth, sendEmailWithOtp, verifyOtp, reject } = useWalletEmailSigner();
    const walletAddress = useMemo(() => wallet?.address, [wallet]);
    const url = Linking.useURL();

    const [balances, setBalances] = useState<Balances | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);

    // Email signer states
    const [otp, setOtp] = useState("");
    const [txLink, setTxLink] = useState<string | null>(null);
    const [uiError, setUiError] = useState<string | null>(null);
    const [recipientAddress, setRecipientAddress] = useState("");
    const [amount, setAmount] = useState<string>("");

    useEffect(() => {
        if (url != null) {
            createAuthSession(url);
        }
    }, [url, createAuthSession]);

    useEffect(() => {
        async function fetchBalances() {
            if (wallet == null) {
                return;
            }
            try {
                const balances = await wallet.balances();
                setBalances(balances);
            } catch (error) {
                console.log("Error fetching wallet balances:", error);
            }
        }
        fetchBalances();
    }, [wallet]);

    const handleAction = async (action: () => Promise<any> | void) => {
        setIsLoading(true);
        setUiError(null);
        setTxLink(null);
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

    async function initWallet() {
        if (user == null) {
            console.log("User not logged in");
            return;
        }
        setIsLoading(true);
        try {
            await getOrCreateWallet({ chain: "base-sepolia", signer: { type: "email" } });
        } catch (error) {
            console.error("Error initializing wallet:", error);
        } finally {
            setIsLoading(false);
        }
    }

    async function onHandleFundUSDC() {
        if (walletAddress == null) {
            console.log("Wallet address not found");
            return;
        }
        setIsLoading(true);
        try {
            await fundUSDC({
                jwt: jwt ?? "",
                walletAddress: walletAddress ?? "",
                amount: 5,
            });
        } catch (error) {
            console.error("Error funding USDC:", error);
        } finally {
            setIsLoading(false);
        }
    }

    const handleSendOtpEmail = async () => {
        if (typeof loggedInUserEmail !== "string") {
            Alert.alert("Error", "User email is not available.");
            return;
        }

        await handleAction(sendEmailWithOtp);
    };

    const handleVerifyOtpInput = async () => {
        if (!otp || !verifyOtp) {
            Alert.alert("Error", "Please enter the OTP and ensure email signer is available.");
            return;
        }
        await handleAction(async () => {
            await verifyOtp(otp);
            setOtp("");
        });
    };

    async function sendUSDC() {
        if (walletStatus !== "loaded" || wallet == null) {
            Alert.alert("Error", "Wallet is not loaded or is not a Solana smart wallet.");
            return;
        }
        setIsLoading(true);
        try {
            const tx = await wallet.send(recipientAddress, "xlm", amount);
            console.log(`Sent ${amount} USDC to ${recipientAddress}. Tx Link: ${tx.explorerLink}`);
            setTxLink(tx.explorerLink);
            setRecipientAddress("");
            setAmount("");
        } catch (error) {
            console.log("error sending usdc", error);
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
            {isLoading && <ActivityIndicator size="large" color="#0000ff" />}

            <View style={styles.statusSection}>
                <Text style={{ fontWeight: "bold" }}>User: {user?.email}</Text>
                <Text>Wallet: {walletAddress}</Text>
                <Text>Auth Status: {walletStatus}</Text>
                <Text>Needs OTP Auth: {needsAuth ? "Yes" : "No"}</Text>
                <Text>
                    Native Token Balance: ({balances?.nativeToken.symbol}) {balances?.nativeToken.amount}
                </Text>
                <Text>USDC Balance: {balances?.usdc.amount}</Text>
                {uiError && <Text style={styles.errorText}>Last Action Error: {uiError}</Text>}
                {txLink && <Text>Last Tx Link: {txLink}</Text>}
            </View>

            <View style={styles.section}>
                <Button title="Init Wallet" onPress={initWallet} disabled={isLoading} />
                <Button title="Get $5 USDC" onPress={onHandleFundUSDC} disabled={isLoading} />
            </View>

            <View style={styles.section}>
                <Button
                    title="Login with Google"
                    onPress={() => {
                        console.log("login with google");
                        loginWithOAuth("google");
                    }}
                    disabled={isLoading}
                />
                <Button
                    title="Logout"
                    onPress={() => {
                        console.log("logout");
                        logout();
                    }}
                    disabled={isLoading}
                />
            </View>

            {needsAuth && (
                <View style={styles.section}>
                    <Text style={{ fontWeight: "bold", marginBottom: 10 }}>Email OTP Verification (required)</Text>
                    <Button title="Send OTP Email" onPress={handleSendOtpEmail} disabled={loggedInUserEmail == null} />
                    <TextInput
                        placeholder="Enter OTP from Email"
                        value={otp}
                        onChangeText={setOtp}
                        style={styles.input}
                        keyboardType="numeric"
                        autoCapitalize="none"
                    />
                    <Button title="Verify OTP" onPress={handleVerifyOtpInput} disabled={!otp || isLoading} />
                    <Button title="Reject" onPress={() => reject(new Error("Rejected OTP"))} />
                </View>
            )}

            {walletAddress != null && (
                <View style={styles.section}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 10, width: "100%" }}>
                        <View style={{ flex: 1 }}>
                            <Text>Send USDC to</Text>
                            <TextInput
                                placeholder="Enter address"
                                value={recipientAddress}
                                onChangeText={setRecipientAddress}
                                style={styles.input}
                            />
                        </View>
                        <View style={{ width: 100 }}>
                            <Text>Amount</Text>
                            <TextInput
                                placeholder="Amount"
                                value={amount}
                                onChangeText={setAmount}
                                style={styles.input}
                            />
                        </View>
                    </View>
                    <Button title="Send USDC" onPress={sendUSDC} disabled={isLoading || amount === ""} />
                </View>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    contentContainer: { padding: 16 },
    section: {
        marginBottom: 20,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: "#eee",
        gap: 10,
    },
    statusSection: {
        marginBottom: 20,
        padding: 15,
        backgroundColor: "#f0f0f0",
        borderRadius: 5,
        gap: 5,
    },
    input: {
        borderWidth: 1,
        borderColor: "#ccc",
        padding: 10,
        marginBottom: 10,
        borderRadius: 5,
    },
    errorText: {
        color: "red",
        marginTop: 5,
    },
});
