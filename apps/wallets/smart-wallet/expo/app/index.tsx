import "react-native-get-random-values";
import { install } from "react-native-quick-crypto";
install();

import {
    type SolanaSmartWallet,
    useCrossmint,
    useCrossmintAuth,
    useWallet,
} from "@crossmint/client-sdk-react-native-ui";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AppState, AppStateStatus, Button, Linking, Text, View } from "react-native";
import {
    Keypair,
    Connection,
    PublicKey,
    TransactionInstruction,
    TransactionMessage,
    VersionedTransaction,
} from "@solana/web3.js";
import { type ExternalPathString, Link } from "expo-router";
import { useGlobalSearchParams } from "expo-router";

type SearchParams = {
    oneTimeSecret?: string;
};

const jwt = process.env.EXPO_PUBLIC_CROSSMINT_JWT;

export default function Index() {
    const { oneTimeSecret } = useGlobalSearchParams<SearchParams>();

    const [oneTimeSecretTwo, setOneTimeSecretTwo] = useState<string | undefined>(undefined);
    const { setJwt, crossmint } = useCrossmint();
    const { crossmintAuth } = useCrossmintAuth();
    const { wallet, error, getOrCreateWallet } = useWallet();
    const [signInUrl, setSignInUrl] = useState<ExternalPathString | null>(null);
    console.log("crossmint", crossmint);

    useEffect(() => {
        if (oneTimeSecret) {
            console.log("[expo app] easy oneTimeSecret", oneTimeSecret);
        }
    }, [oneTimeSecret]);

    useEffect(() => {
        crossmintAuth?.getOAuthUrl("google").then(setSignInUrl);
    }, [crossmintAuth]);

    useEffect(() => {
        setJwt(jwt);
    }, [setJwt]);

    const extractOneTimeSecretFromUrl = (url: string): string | undefined => {
        const regex = /[?&]oneTimeSecret=([^&]+)/; // Use the refined regex
        const match = url.match(regex);
        return match ? decodeURIComponent(match[1]) : undefined;
    };

    // --- Deep Link Handling ---
    const handleUrl = useCallback((url: string | null) => {
        if (url) {
            console.log("[expo app] Handling URL:", url);
            const secret = extractOneTimeSecretFromUrl(url);
            console.log("[expo app] Extracted Secret:", secret);
            if (secret) {
                setOneTimeSecretTwo(secret);
            }
        }
    }, []); // Keep dependencies minimal

    useEffect(() => {
        // 1. Handle initial URL
        Linking.getInitialURL()
            .then(handleUrl)
            .catch((err) => console.warn("[expo app] Error getting initial URL:", err));

        // 2. Listen for subsequent URLs
        const linkingSubscription = Linking.addEventListener("url", (event) => {
            console.log("[expo app] Linking event listener fired:", event);
            handleUrl(event.url);
        });

        // 3. Listen for AppState changes (foreground check)
        const appStateSubscription = AppState.addEventListener("change", (nextAppState: AppStateStatus) => {
            if (nextAppState === "active") {
                console.log("[expo app] App became active, checking initial URL again.");
                Linking.getInitialURL()
                    .then(handleUrl)
                    .catch((err) => console.warn("[expo app] Error getting initial URL on foreground:", err));
            }
        });

        // Cleanup
        return () => {
            console.log("[expo app] Cleaning up listeners.");
            linkingSubscription.remove();
            appStateSubscription.remove();
        };
    }, [handleUrl]); // Rerun if handleUrl identity changes (shouldn't often)
    // --- End Deep Link Handling --

    useEffect(() => {
        if (oneTimeSecretTwo) {
            console.log("[expo app] oneTimeSecret state updated:", oneTimeSecretTwo);
            // Use oneTimeSecret as needed (e.g., call an auth function)
            // Consider clearing it after use: setOneTimeSecret(undefined);
        }
    }, [oneTimeSecretTwo]);

    function initWallet() {
        const keypair = Keypair.fromSeed(
            new Uint8Array([
                42, 42, 42, 42, 42, 42, 42, 42, 42, 42, 42, 42, 42, 42, 42, 42, 42, 42, 42, 42, 42, 42, 42, 42, 42, 42,
                42, 42, 42, 42, 42, 42,
            ])
        );
        getOrCreateWallet({
            type: "solana-smart-wallet",
            args: {
                adminSigner: {
                    type: "solana-keypair",
                    signer: keypair,
                    address: keypair.publicKey.toBase58(),
                },
            },
        });
    }

    async function makeTransaction() {
        if (wallet == null) {
            console.log("Wallet not initialized");
            return;
        }

        const connection = new Connection("https://api.devnet.solana.com");
        const memoInstruction = new TransactionInstruction({
            keys: [
                {
                    pubkey: new PublicKey(wallet.getAddress()),
                    isSigner: true,
                    isWritable: true,
                },
            ],
            data: Buffer.from("Hello from Crossmint SDK", "utf-8"),
            programId: new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"),
        });

        const blockhash = (await connection.getLatestBlockhash()).blockhash;
        const newMessage = new TransactionMessage({
            payerKey: new PublicKey(wallet.getAddress()),
            recentBlockhash: blockhash,
            instructions: [memoInstruction],
        });

        const transaction = new VersionedTransaction(newMessage.compileToV0Message());

        const txHash = await (wallet as SolanaSmartWallet).sendTransaction({
            transaction,
        });
        console.log("txHash", txHash);
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
            {signInUrl && (
                <Link href={signInUrl} asChild>
                    <Button title="Sign In" />
                </Link>
            )}
        </View>
    );
}
