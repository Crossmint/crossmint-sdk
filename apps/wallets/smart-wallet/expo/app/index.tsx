import { useAuth, useWallet, type Balances } from "@crossmint/client-sdk-react-native-ui";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Button, Text, View, TextInput, StyleSheet, ScrollView, Alert } from "react-native";
import * as Linking from "expo-linking";
import { fundUSDC } from "@/utils/usdcFaucet";
// import { HeadlessSigning } from "@/components/headless-signing";

export default function Index() {
    const { loginWithOAuth, user, logout, createAuthSession, jwt } = useAuth();
    const { wallet, status: walletStatus } = useWallet();
    const walletAddress = useMemo(() => wallet?.address, [wallet]);
    const url = Linking.useURL();

    const [balances, setBalances] = useState<Balances | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);

    const [txLink, setTxLink] = useState<string | null>(null);
    const [recipientAddress, setRecipientAddress] = useState("");
    const [amount, setAmount] = useState<string>("");

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
                const balances = await wallet.balances();
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
            const tx = await wallet.send(recipientAddress, "usdc", amount);
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
                <Text>
                    Native Token Balance: ({balances?.nativeToken.symbol}) {balances?.nativeToken.amount}
                </Text>
                <Text>USDC Balance: {balances?.usdc.amount}</Text>
                {txLink && <Text>Last Tx Link: {txLink}</Text>}
            </View>

            <View style={styles.section}>
                {walletAddress != null && (
                    <Button title="Get $5 USDC" onPress={onHandleFundUSDC} disabled={isLoading} />
                )}
            </View>

            <View style={styles.section}>
                {user == null ? (
                    <Button
                        title="Login with Google"
                        onPress={() => {
                            console.log("login with google");
                            loginWithOAuth("google");
                        }}
                        disabled={isLoading}
                    />
                ) : (
                    <Button
                        title="Logout"
                        onPress={() => {
                            console.log("logout");
                            logout();
                        }}
                        disabled={isLoading}
                    />
                )}
            </View>

            {/* To test headless signing, 
            1. import and uncomment <HeadlessSigning/>
            2. add 'experimental_headlessSigningFlow' to CrossmintWalletProvider in _layout.tsx
            3. remove 'createOnLogin' from CrossmintWalletProvider in _layout.tsx */}
            {/* <HeadlessSigning /> */}

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
});
