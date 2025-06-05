import { useCrossmintAuth, useWallet } from "@crossmint/client-sdk-react-native-ui";
import { useEffect, useMemo, useState } from "react";
import { Button, Text, View } from "react-native";
import * as Linking from "expo-linking";
import {
    Connection,
    PublicKey,
    TransactionInstruction,
    TransactionMessage,
    VersionedTransaction,
} from "@solana/web3.js";
import { Link } from "expo-router";
import { SolanaWallet } from "@crossmint/wallets-sdk";

export default function Index() {
    const { loginWithOAuth, user, logout, createAuthSession } = useCrossmintAuth();
    const { wallet, error, getOrCreateWallet } = useWallet();
    const [txHash, setTxHash] = useState<string | null>(null);
    const walletAddress = useMemo(() => wallet?.address, [wallet]);
    const url = Linking.useURL();

    useEffect(() => {
        if (url != null) {
            createAuthSession(url);
        }
    }, [url, createAuthSession]);

    function initWallet() {
        if (user == null) {
            console.log("User not logged in");
            return;
        }
        getOrCreateWallet({ chain: "solana", signer: { type: "api-key" } });
    }

    async function makeTransaction() {
        if (wallet == null) {
            console.log("Wallet not initialized");
            return;
        }

        try {
            const memoInstruction = new TransactionInstruction({
                keys: [
                    {
                        pubkey: new PublicKey(wallet.address),
                        isSigner: true,
                        isWritable: true,
                    },
                ],
                data: Buffer.from("Hello from Crossmint SDK", "utf-8"),
                programId: new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"),
            });

            const connection = new Connection("https://api.devnet.solana.com");
            const blockhash = (await connection.getLatestBlockhash()).blockhash;
            const newMessage = new TransactionMessage({
                payerKey: new PublicKey(wallet.address),
                recentBlockhash: blockhash,
                instructions: [memoInstruction],
            });

            const transaction = new VersionedTransaction(newMessage.compileToV0Message());

            const solanaWallet = SolanaWallet.from(wallet as SolanaWallet);
            const txHash = await solanaWallet.sendTransaction({
                transaction,
            });

            setTxHash(txHash);
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
            <Text>Transaction Hash: {txHash}</Text>
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
            <Link href="/signer" asChild>
                <Button title="Go to Signer Flow" />
            </Link>
        </View>
    );
}
