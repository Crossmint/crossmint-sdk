import { useCrossmintAuth, useWallet } from "@crossmint/client-sdk-react-native-ui";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Button, Text, View } from "react-native";
import * as Linking from "expo-linking";
import { Link } from "expo-router";
import { fundUSDC } from "@/utils/usdcFaucet";

export default function Index() {
    const { loginWithOAuth, user, logout, createAuthSession, jwt } = useCrossmintAuth();
    const { wallet, error, getOrCreateWallet } = useWallet();
    const walletAddress = useMemo(() => wallet?.address, [wallet]);
    const url = Linking.useURL();

    const [usdcBalance, setUsdcBalance] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);

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
                const balances = await wallet.balances(["usdc"]);
                setUsdcBalance(balances[0].amount);
            } catch (error) {
                console.log("Error fetching wallet balances:", error);
            }
        }
        fetchBalances();
    }, [wallet]);

    async function initWallet() {
        if (user == null) {
            console.log("User not logged in");
            return;
        }
        setIsLoading(true);
        try {
            await getOrCreateWallet({ chain: "solana", signer: { type: "email" } });
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

    return (
        <View
            style={{
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
                gap: 20,
                paddingHorizontal: 20,
            }}
        >
            {isLoading && <ActivityIndicator size="large" color="#0000ff" />}

            <View style={{ alignItems: "center", gap: 5 }}>
                <Text style={{ fontWeight: "bold" }}>User: {user?.email}</Text>
                <Text>Wallet: {walletAddress}</Text>
                <Text>USDC Balance: {usdcBalance}</Text>
                <Text>Error: {error}</Text>
            </View>

            <View>
                <Button title="Init Wallet" onPress={initWallet} disabled={isLoading} />
                <Button title="Get $5 USDC" onPress={onHandleFundUSDC} disabled={isLoading} />
            </View>

            <View>
                <Button
                    title="Login with Google"
                    onPress={() => {
                        console.log("login with google");
                        loginWithOAuth("google");
                    }}
                />
                <Button
                    title="Logout"
                    onPress={() => {
                        console.log("logout");
                        logout();
                    }}
                />
            </View>

            {walletAddress != null ? (
                <View style={{ marginTop: 10 }}>
                    <Link href="/signer" asChild>
                        <Button title="Go to Email Signer Flow" />
                    </Link>
                    <Text style={{ fontSize: 12, color: "#666" }}>
                        Make sure to have some USDC in your wallet to send!
                    </Text>
                </View>
            ) : null}
        </View>
    );
}
