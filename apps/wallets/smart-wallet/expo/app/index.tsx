import { useWallet, useCrossmintAuth, type Balances } from "@crossmint/client-sdk-react-native-ui";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Button, Text, View, TextInput, StyleSheet, ScrollView, Alert } from "react-native";
import * as Linking from "expo-linking";
import { fundUSDC } from "@/utils/usdcFaucet";
// import { HeadlessSigning } from "@/components/headless-signing";

function getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    }
    return "Unknown error";
}

export default function Index() {
    const {
        user,
        logout,
        createAuthSession,
        loginWithOAuth,
        jwt,
        crossmintAuth,
        status: authStatus,
    } = useCrossmintAuth();
    const { wallet, status: walletStatus } = useWallet();
    const walletAddress = useMemo(() => wallet?.address, [wallet]);
    const url = Linking.useURL();
    const isAuthenticated = authStatus === "logged-in";

    const [balances, setBalances] = useState<Balances | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);

    const [txLink, setTxLink] = useState<string | null>(null);
    const [recipientAddress, setRecipientAddress] = useState("");
    const [amount, setAmount] = useState<string>("");

    // Email login state
    const [loginEmail, setLoginEmail] = useState("");
    const [loginOtp, setLoginOtp] = useState("");
    const [emailId, setEmailId] = useState<string | null>(null);

    console.log("wallet", wallet);

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
                const balances = await wallet.balances(["usdxm"]);
                console.log("balances", balances);
                setBalances(balances);
            } catch (error) {
                console.log("Error fetching wallet balances:", error);
            }
        }
        fetchBalances();
    }, [wallet]);

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

    async function sendUSDC() {
        if (walletStatus !== "loaded" || wallet == null) {
            Alert.alert("Error", "Wallet is not loaded or is not a Solana smart wallet.");
            return;
        }
        setIsLoading(true);
        try {
            const tx = await wallet.send(recipientAddress, "usdxm", amount);
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
                <Text style={{ fontWeight: "bold" }}>
                    User: {user?.email ?? (isAuthenticated ? "Loading..." : "Not logged in")}
                </Text>
                <Text>Wallet: {walletAddress}</Text>
                <Text>Login Status: {authStatus}</Text>
                <Text>Auth Status: {walletStatus}</Text>
                <Text>
                    Native Token Balance: ({balances?.nativeToken.symbol}) {balances?.nativeToken.amount}
                </Text>
                <Text>USDXM Balance: {balances?.tokens.find((t) => t.symbol === "usdxm")?.amount ?? "0"}</Text>
                {txLink && <Text>Last Tx Link: {txLink}</Text>}
            </View>

            <View style={styles.section}>
                {walletAddress != null && (
                    <Button title="Get $5 USDXM" onPress={onHandleFundUSDC} disabled={isLoading} />
                )}
                {/* <ExportPrivateKeyButton /> */}
            </View>

            <View style={styles.section}>
                {!isAuthenticated ? (
                    <>
                        <Button
                            title="Login with Google"
                            onPress={() => loginWithOAuth("google")}
                            disabled={isLoading}
                        />
                        <TextInput
                            placeholder="Email"
                            value={loginEmail}
                            onChangeText={setLoginEmail}
                            style={styles.input}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />
                        <Button
                            title="Send OTP"
                            disabled={!loginEmail || isLoading}
                            onPress={async () => {
                                setIsLoading(true);
                                try {
                                    const res = await crossmintAuth.sendEmailOtp(loginEmail);
                                    setEmailId(res.emailId);
                                } catch (error: unknown) {
                                    Alert.alert("Error", getErrorMessage(error));
                                } finally {
                                    setIsLoading(false);
                                }
                            }}
                        />
                        {emailId != null && (
                            <>
                                <TextInput
                                    placeholder="Enter OTP"
                                    value={loginOtp}
                                    onChangeText={setLoginOtp}
                                    style={styles.input}
                                    keyboardType="numeric"
                                />
                                <Button
                                    title="Verify OTP"
                                    disabled={!loginOtp || isLoading}
                                    onPress={async () => {
                                        setIsLoading(true);
                                        try {
                                            const secret = await crossmintAuth.confirmEmailOtp(
                                                loginEmail,
                                                emailId,
                                                loginOtp
                                            );
                                            await createAuthSession(secret);
                                            setEmailId(null);
                                            setLoginOtp("");
                                        } catch (error: unknown) {
                                            Alert.alert("Error", getErrorMessage(error));
                                        } finally {
                                            setIsLoading(false);
                                        }
                                    }}
                                />
                            </>
                        )}
                    </>
                ) : (
                    <Button
                        title="Logout"
                        onPress={() => {
                            logout();
                        }}
                        disabled={isLoading}
                    />
                )}
            </View>

            {/* To test headless signing,
            1. import and uncomment <HeadlessSigning/>
            2. add 'showOtpSignerPrompt={false}' to CrossmintWalletProvider in _layout.tsx
            3. remove 'createOnLogin' from CrossmintWalletProvider in _layout.tsx */}
            {/* <HeadlessSigning /> */}

            {walletAddress != null && (
                <View style={styles.section}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 10, width: "100%" }}>
                        <View style={{ flex: 1 }}>
                            <Text>Send USDXM to</Text>
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
                    <Button title="Send USDXM" onPress={sendUSDC} disabled={isLoading || amount === ""} />
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
});
