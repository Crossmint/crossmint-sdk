"use client";

import { useEffect, useState } from "react";
import bs58 from "bs58";
import * as web3 from "@solana/web3.js";
import nacl from "tweetnacl";
import { ChildWindow } from "@crossmint/client-sdk-window";
import { z } from "zod";
import {
    ParentIncomingEvents,
    ParentOutgoingEvents,
} from "@crossmint/client-signers";

// For the iframe implementation, we need to flip the events:
// - What the parent sends out (ParentOutgoingEvents), we receive (ChildIncomingEvents)
// - What the parent receives (ParentIncomingEvents), we send out (ChildOutgoingEvents)
const ChildIncomingEvents = ParentOutgoingEvents;

// Extend the outgoing events to include the heartbeat event
const ChildOutgoingEvents = {
    ...ParentIncomingEvents,
    "iframe:heartbeat": z.object({
        timestamp: z.number(),
        address: z.string(),
    }),
};

// Solana Signer implementation
class SolanaLocalSigner {
    private keypair: web3.Keypair;

    constructor(keypair: web3.Keypair) {
        this.keypair = keypair;
    }

    get address(): string {
        return this.keypair.publicKey.toBase58();
    }

    get publicKey(): web3.PublicKey {
        return this.keypair.publicKey;
    }

    async signMessage(message: Uint8Array): Promise<Uint8Array> {
        const signature = nacl.sign.detached(
            Uint8Array.from(message),
            this.keypair.secretKey
        );
        return Uint8Array.from(signature);
    }

    async signTransaction(
        transaction: web3.Transaction | web3.VersionedTransaction
    ): Promise<web3.Transaction | web3.VersionedTransaction> {
        if (transaction instanceof web3.Transaction) {
            transaction.sign(this.keypair);
            return transaction;
        } else if (
            "version" in transaction &&
            "signatures" in transaction &&
            "message" in transaction
        ) {
            const signData = transaction.message.serialize();
            const signature = nacl.sign.detached(
                Uint8Array.from(signData),
                this.keypair.secretKey
            );

            const transactionAsAny = transaction as any;
            transactionAsAny.signatures[0] = {
                signature: Buffer.from(signature),
                publicKey: this.keypair.publicKey,
            };

            return transaction;
        } else {
            throw new Error("Unsupported transaction type");
        }
    }
}

// Create a keypair for the signer
async function getOrCreateSigner(): Promise<SolanaLocalSigner> {
    // For simplicity, just generate a new keypair each time
    const keypair = web3.Keypair.generate();
    return new SolanaLocalSigner(keypair);
}

export default function IFramePage() {
    const [signer, setSigner] = useState<SolanaLocalSigner | null>(null);
    const [logs, setLogs] = useState<string[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const LOG_PREFIX = "[IFramePage]";

    // Log function to track events
    const addLog = (message: string) => {
        console.log(`${LOG_PREFIX} Log: ${message}`);
        setLogs((prev) => {
            const newLogs = [
                ...prev,
                `${new Date().toISOString().slice(11, 19)} - ${message}`,
            ];
            return newLogs.slice(-50);
        });
    };

    useEffect(() => {
        console.log(`${LOG_PREFIX} Component mounted`);
        console.log(`${LOG_PREFIX} Window location:`, window.location.href);
        console.log(`${LOG_PREFIX} User agent:`, navigator.userAgent);

        const setupIframe = async () => {
            console.log(`${LOG_PREFIX} Starting iframe setup...`);
            try {
                // Create the signer with a new keypair
                console.log(`${LOG_PREFIX} Creating signer instance...`);
                const signerInstance = await getOrCreateSigner();
                setSigner(signerInstance);
                addLog(
                    `Initialized signer with address: ${signerInstance.address}`
                );
                console.log(
                    `${LOG_PREFIX} Signer created with address: ${signerInstance.address}`
                );

                // Create the ChildWindow for communication with parent
                console.log(`${LOG_PREFIX} Creating ChildWindow instance...`);
                const messenger = new ChildWindow(
                    window.parent,
                    "*", // Accept messages from any origin for testing
                    {
                        // Flip the events since we're on the child side:
                        // What parent sends, we receive
                        incomingEvents: ChildIncomingEvents,
                        // What parent receives, we send
                        outgoingEvents: ChildOutgoingEvents,
                    }
                );

                // Set up handlers for requests from the parent
                setupEventHandlers(messenger, signerInstance);

                // Perform handshake with parent
                console.log(`${LOG_PREFIX} Starting handshake process...`);
                await messenger.handshakeWithParent();
                addLog("🤝 Handshake with parent completed");
                console.log(`${LOG_PREFIX} Handshake completed successfully`);
                setLoading(false);

                // Send heartbeat signals periodically
                const heartbeatInterval = setInterval(() => {
                    console.log(`${LOG_PREFIX} Sending heartbeat signal`);
                    try {
                        // Send a custom heartbeat message
                        messenger.send("iframe:heartbeat", {
                            timestamp: Date.now(),
                            address: signerInstance.address,
                        });
                    } catch (error) {
                        console.error(
                            `${LOG_PREFIX} Error sending heartbeat:`,
                            error
                        );
                    }
                }, 5000);

                return () => {
                    console.log(`${LOG_PREFIX} Cleaning up resources`);
                    clearInterval(heartbeatInterval);
                };
            } catch (error) {
                console.error(`${LOG_PREFIX} Error setting up iframe:`, error);
                addLog(
                    `❌ Error setting up iframe: ${
                        error instanceof Error ? error.message : String(error)
                    }`
                );
                setLoading(false);
            }
        };

        const cleanup = setupIframe();
        return () => {
            console.log(`${LOG_PREFIX} Component unmounting`);
            cleanup?.then((fn) => fn?.());
        };
    }, []);

    // Setup event handlers for the parent's requests
    const setupEventHandlers = (
        messenger: ChildWindow<
            typeof ChildIncomingEvents,
            typeof ChildOutgoingEvents
        >,
        signerInstance: SolanaLocalSigner
    ) => {
        // Handle get-public-key request
        messenger.on("request:get-public-key", async () => {
            console.log(`${LOG_PREFIX} Handling request:get-public-key`);
            addLog("📤 Received request:get-public-key");
            try {
                const response = {
                    publicKey: signerInstance.address,
                };
                messenger.send("response:get-public-key", response);
                addLog(`📬 Sent public key: ${response.publicKey}`);
            } catch (error) {
                handleError(messenger, error, "Error getting public key");
            }
        });

        // Handle attestation request
        messenger.on("request:attestation", async () => {
            console.log(`${LOG_PREFIX} Handling request:attestation`);
            addLog("📤 Received request:attestation");
            try {
                // Create a simple attestation response
                const attestation = {
                    attestation: {
                        publicKey: signerInstance.address,
                        timestamp: Date.now(),
                        source: "solana-iframe-signer",
                        valid: true,
                    },
                };
                messenger.send("response:attestation", attestation);
                addLog("📬 Sent attestation response");
            } catch (error) {
                handleError(messenger, error, "Error creating attestation");
            }
        });

        // Handle sign-message request
        messenger.on("request:sign-message", async (data) => {
            console.log(`${LOG_PREFIX} Handling request:sign-message:`, data);
            addLog("📤 Received request:sign-message");
            try {
                // Decode the message from base58
                const message = bs58.decode(data.message);
                console.log(
                    `${LOG_PREFIX} Decoded message length:`,
                    message.length
                );

                // Sign the message
                const signature = await signerInstance.signMessage(message);
                console.log(
                    `${LOG_PREFIX} Message signed, signature length:`,
                    signature.length
                );

                // Send back the signature
                const response = {
                    address: signerInstance.address,
                    signature: bs58.encode(signature),
                };
                messenger.send("response:sign-message", response);
                addLog("📬 Message signed successfully");
            } catch (error) {
                handleError(messenger, error, "Error signing message");
            }
        });

        // Handle sign-transaction request
        messenger.on("request:sign-transaction", async (data) => {
            console.log(`${LOG_PREFIX} Handling request:sign-transaction`);
            addLog("📤 Received request:sign-transaction");
            try {
                // Decode the transaction from base58
                const serializedTransaction = bs58.decode(data.transaction);
                console.log(
                    `${LOG_PREFIX} Decoded transaction length:`,
                    serializedTransaction.length
                );

                // Determine if legacy or versioned transaction
                const isVersioned = serializedTransaction[0] === 0x80;
                console.log(
                    `${LOG_PREFIX} Transaction type:`,
                    isVersioned ? "Versioned" : "Legacy"
                );

                let transaction;
                if (isVersioned) {
                    console.log(
                        `${LOG_PREFIX} Deserializing versioned transaction`
                    );
                    transaction = web3.VersionedTransaction.deserialize(
                        serializedTransaction
                    );
                } else {
                    console.log(
                        `${LOG_PREFIX} Deserializing legacy transaction`
                    );
                    transaction = web3.Transaction.from(serializedTransaction);
                }

                // Sign the transaction
                console.log(`${LOG_PREFIX} Signing transaction...`);
                const signedTransaction = await signerInstance.signTransaction(
                    transaction
                );
                console.log(`${LOG_PREFIX} Transaction signed successfully`);

                // Serialize and return
                let serializedSignedTransaction;
                if (isVersioned) {
                    console.log(
                        `${LOG_PREFIX} Serializing signed versioned transaction`
                    );
                    serializedSignedTransaction = (
                        signedTransaction as web3.VersionedTransaction
                    ).serialize();
                } else {
                    console.log(
                        `${LOG_PREFIX} Serializing signed legacy transaction`
                    );
                    serializedSignedTransaction = (
                        signedTransaction as web3.Transaction
                    ).serialize();
                }

                const response = {
                    transaction: bs58.encode(
                        Array.from(serializedSignedTransaction)
                    ),
                };
                messenger.send("response:sign-transaction", response);
                addLog("📬 Transaction signed successfully");
            } catch (error) {
                handleError(messenger, error, "Error signing transaction");
            }
        });

        // Helper function to handle errors
        const handleError = (
            messenger: ChildWindow<
                typeof ChildIncomingEvents,
                typeof ChildOutgoingEvents
            >,
            error: any,
            prefix: string
        ) => {
            const errorMessage = `${prefix}: ${
                error instanceof Error ? error.message : String(error)
            }`;
            console.error(`${LOG_PREFIX} ${errorMessage}`, error);
            addLog(`❌ ${errorMessage}`);

            const errorResponse = {
                code: 1000,
                message: errorMessage,
            };
            messenger.send("error", errorResponse);
        };
    };

    // Simple UI
    return (
        <div className="flex flex-col p-4 h-full bg-gray-100 text-black">
            <header className="mb-4">
                <h1 className="text-xl font-bold">Solana Iframe Signer</h1>
                {signer && (
                    <div className="text-sm mt-1">
                        <span className="font-medium">Wallet Address:</span>{" "}
                        <code className="bg-gray-200 p-1 rounded">
                            {signer.address}
                        </code>
                    </div>
                )}
            </header>

            <div className="flex-1 overflow-auto bg-white rounded border border-gray-300 p-2">
                <h2 className="text-lg font-semibold mb-2">Activity Log:</h2>
                {loading ? (
                    <p>Loading...</p>
                ) : logs.length === 0 ? (
                    <p className="text-gray-500">No activity yet.</p>
                ) : (
                    <div className="space-y-1">
                        {logs.map((log, index) => (
                            <div
                                key={index}
                                className="text-xs font-mono border-b border-gray-100 pb-1"
                            >
                                {log}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
