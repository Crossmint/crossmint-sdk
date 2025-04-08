import "react-native-get-random-values";
import { install } from "react-native-quick-crypto";
install();

import { useCrossmintAuth, useWallet, type SolanaSmartWallet } from "@crossmint/client-sdk-react-native-ui";
import { useMemo } from "react";
import { Button, Text, View } from "react-native";
import { PublicKey, TransactionInstruction, TransactionMessage, VersionedTransaction } from "@solana/web3.js";

export default function Index() {
    const { loginWithOAuth, user } = useCrossmintAuth();
    const { wallet, error, getOrCreateWallet } = useWallet();

    function initWallet() {
        console.log("user", user);
        if (user == null) {
            console.log("User not logged in");
            return;
        }
        getOrCreateWallet({
            type: "solana-smart-wallet",
            args: {
                linkedUser: `email:${user?.email}`,
            },
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

        const newMessage = new TransactionMessage({
            payerKey: new PublicKey("11111111111111111111111111111112"),
            recentBlockhash: "11111111111111111111111111111111",
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

    const walletAddress = useMemo(() => wallet?.getAddress(), [wallet]);

    return (
        <View
            style={{
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
            }}
        >
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
        </View>
    );
}
