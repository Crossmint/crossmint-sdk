import "react-native-get-random-values";
import { install } from "react-native-quick-crypto";
install();

import { useCrossmintAuth, useWallet, type SolanaSmartWallet } from "@crossmint/client-sdk-react-native-ui";
import { useMemo } from "react";
import { Button, Text, View } from "react-native";
import {
    Connection,
    PublicKey,
    TransactionInstruction,
    TransactionMessage,
    VersionedTransaction,
} from "@solana/web3.js";
export default function Index() {
    const { loginWithOAuth, user, logout } = useCrossmintAuth();
    const { wallet, error, getOrCreateWallet } = useWallet();
    const walletAddress = useMemo(() => wallet?.getAddress(), [wallet]);

    function initWallet() {
        console.log("user", user);
        if (user == null) {
            console.log("User not logged in");
            return;
        }
        getOrCreateWallet({
            type: "solana-smart-wallet",
            args: {},
        });
    }

    async function makeTransaction() {
        console.log("wallet", wallet);
        if (wallet == null) {
            console.log("Wallet not initialized");
            return;
        }

        const memoInstruction = new TransactionInstruction({
            keys: [],
            data: Buffer.from("Hello from Crossmint SDK", "utf-8"),
            programId: new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"),
        });

        const connection = new Connection("https://api.devnet.solana.com");
        const blockhash = (await connection.getLatestBlockhash()).blockhash;
        const newMessage = new TransactionMessage({
            payerKey: new PublicKey(wallet.getAddress()),
            recentBlockhash: blockhash,
            instructions: [memoInstruction],
        });

        const transaction = new VersionedTransaction(newMessage.compileToV0Message());
        console.log("transaction", transaction);

        try {
            const txHash = await (wallet as SolanaSmartWallet).sendTransaction({
                transaction,
            });
            console.log("txHash", txHash);
        } catch (error) {
            console.log("error", error);
        }
    }

    return (
        <View
            style={{
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
            }}
        >
            <Text>User: {user?.email}</Text>
            <Text>Wallet: {walletAddress}</Text>
            <Text>Error: {error}</Text>
            <Button title="Init Wallet" onPress={() => initWallet()} />
            <Button title="Make Transaction" onPress={() => makeTransaction()} />
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
    );
}
