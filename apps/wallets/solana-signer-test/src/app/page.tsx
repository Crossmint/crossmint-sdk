"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { createCrossmintSmartWallet } from "@/lib/create-crossmint-wallet";
import { TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import { createMemoInstruction } from "@solana/spl-memo";
import { Input } from "@/components/ui/input";

// Simple Loader component
const Loader = () => (
    <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        ></path>
    </svg>
);

// Import from the SDK
import { createSolanaIFrameSigner, type SolanaIFrameSigner } from "@crossmint/client-signers";
import type { SolanaSmartWallet } from "@crossmint/wallets-sdk";

// Define the iframe ID constant for consistent referencing
const IFRAME_ID = "solana-signer-iframe";

export default function Home() {
    const [signer, setSigner] = useState<SolanaIFrameSigner | null>(null);
    const [publicKey, setPublicKey] = useState<string | null>(null);
    const [signerStatus, setSignerStatus] = useState<
        "not-initialized" | "initializing" | "initialized" | "connected" | "error"
    >("not-initialized");
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [logs, setLogs] = useState<string[]>([]);
    const [iframeUrl, setIframeUrl] = useState<string>("");
    const [isLoading, setIsLoading] = useState<{ [key: string]: boolean }>({
        init: false,
        publicKey: false,
        createWallet: false,
        sendTransaction: false,
        createSigner: false,
        sendOtp: false,
    });

    // Add state for the smart wallet
    const [smartWallet, setSmartWallet] = useState<{
        address: string;
        status: "creating" | "created" | null;
        wallet: SolanaSmartWallet | null;
    }>({
        address: "",
        status: null,
        wallet: null,
    });

    const [isDebugMode, setIsDebugMode] = useState<boolean>(false);

    // Add state for signer creation
    const [requestId, setRequestId] = useState<string | null>(null);
    const [otpCode, setOtpCode] = useState<string>("");
    const [otpStatus, setOtpStatus] = useState<"not-sent" | "success" | "failed">("not-sent");

    // Log function
    const addLog = (message: string) => {
        setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
    };

    // Initialize the signer
    const initializeSigner = async () => {
        try {
            setIsLoading((prev) => ({ ...prev, init: true }));
            setSignerStatus("initializing");
            addLog("Initializing Solana iFrame signer...");

            // First ensure we have a proper iframe with correct ID
            const iframe = document.getElementById(IFRAME_ID) as HTMLIFrameElement;
            if (iframe) {
                addLog(`Found existing iframe with ID: ${IFRAME_ID}`);
            } else {
                addLog(`No iframe found with ID: ${IFRAME_ID}, this may cause issues`);
            }

            // Create new signer instance
            const newSigner = createSolanaIFrameSigner(
                process.env.NEXT_PUBLIC_IFRAME_URL ||
                    (() => {
                        throw new Error("NEXT_PUBLIC_IFRAME_URL is not set");
                    })()
            );
            setSigner(newSigner);
            addLog("SolanaIFrameSigner instance created");

            // Initialize the signer
            await newSigner.init();
            addLog("Signer initialized successfully");

            setSignerStatus("initialized");
        } catch (error) {
            console.error("Failed to initialize signer", error);
            setSignerStatus("error");
            setErrorMessage((error as Error).message);
            addLog(`Error: ${(error as Error).message}`);
        } finally {
            setIsLoading((prev) => ({ ...prev, init: false }));
        }
    };

    useEffect(() => {
        // Get origin for iframe URL
        // const origin = window.location.origin;
        setIframeUrl(`http://localhost:3000/ncs`);
    }, []);

    // Automatically initialize the signer when the iframe URL is set
    useEffect(() => {
        if (iframeUrl && signerStatus === "not-initialized") {
            initializeSigner();
        }
    }, [iframeUrl, signerStatus]);

    // Get the public key
    const getPublicKey = async () => {
        if (!signer) {
            addLog("No signer available. Please initialize the signer first.");
            return;
        }

        try {
            setIsLoading((prev) => ({ ...prev, publicKey: true }));
            addLog("Getting public key...");

            // First make sure the signer is initialized
            if (signerStatus !== "initialized" && signerStatus !== "connected") {
                await signer.init();
                addLog("Signer initialized");
            }

            // Validate attestation
            await signer.validateAttestation();
            addLog("Attestation validation successful");

            // Get the public key
            const publicKeyStr = await signer.getPublicKey();
            setPublicKey(publicKeyStr);
            setSignerStatus("connected");
            addLog(`Got public key: ${publicKeyStr}`);
        } catch (error) {
            console.error("Failed to get public key", error);
            setErrorMessage((error as Error).message);
            addLog(`Error: ${(error as Error).message}`);
        } finally {
            setIsLoading((prev) => ({ ...prev, publicKey: false }));
        }
    };

    // Send a transaction using the smart wallet
    const sendTransaction = async (transaction?: VersionedTransaction) => {
        if (!smartWallet.wallet) {
            addLog("Smart wallet not available. Please create a wallet first.");
            return;
        }

        if (!transaction) {
            addLog("No transaction provided. Waiting for transaction building implementation.");
            return;
        }

        try {
            setIsLoading((prev) => ({ ...prev, sendTransaction: true }));
            addLog("Sending transaction through smart wallet...");

            // Call the wallet.sendTransaction() method with the provided transaction
            const signature = await smartWallet.wallet.sendTransaction({
                transaction,
            });

            addLog(`Transaction sent successfully! Signature: ${signature}`);
        } catch (error) {
            console.error("Failed to send transaction", error);
            setErrorMessage((error as Error).message);
            addLog(`Error sending transaction: ${(error as Error).message}`);
        } finally {
            setIsLoading((prev) => ({ ...prev, sendTransaction: false }));
        }
    };

    // Create a Crossmint smart wallet
    const createWallet = async () => {
        if (!signer || !publicKey) {
            addLog("Signer or public key not available. Please connect first.");
            return;
        }

        try {
            setIsLoading((prev) => ({ ...prev, createWallet: true }));
            setSmartWallet((prev) => ({ ...prev, status: "creating" }));
            addLog("Creating Crossmint smart wallet...");

            // Create the iframeSigner format required by createCrossmintSmartWallet
            const iframeSigner = {
                type: "solana-keypair" as const,
                address: publicKey,
                signer: {
                    signMessage: signer.signMessage.bind(signer),
                    signTransaction: signer.signTransaction.bind(signer),
                },
            };

            // Create the smart wallet
            const wallet = await createCrossmintSmartWallet(iframeSigner);

            // Update wallet state
            setSmartWallet({
                address: wallet.address,
                status: "created",
                wallet: wallet,
            });

            addLog(`Smart wallet created with address: ${wallet.address}`);
        } catch (error) {
            console.error("Failed to create smart wallet", error);
            setErrorMessage((error as Error).message);
            addLog(`Error creating smart wallet: ${(error as Error).message}`);
            setSmartWallet((prev) => ({ ...prev, status: null }));
        } finally {
            setIsLoading((prev) => ({ ...prev, createWallet: false }));
        }
    };

    // Clean up the signer
    const cleanupSigner = () => {
        if (signer) {
            signer.dispose();
            setSigner(null);
            setPublicKey(null);
            setSignerStatus("not-initialized");
            setSmartWallet({ address: "", status: null, wallet: null });
            addLog("Signer disposed");
        }
    };

    // Create a signer using the iframe
    const createSigner = async () => {
        if (!signer) {
            addLog("No signer available. Please initialize the signer first.");
            return;
        }

        try {
            setIsLoading((prev) => ({ ...prev, createSigner: true }));
            addLog("Sending create-signer request...");

            // Mock values for testing - in a real implementation, use actual values
            const createSignerData = {
                userId: "test-user-id",
                projectId: "test-project-id",
                authId: "test-auth-id",
            };

            // Using the internal service to send the create-signer request
            const response = await signer["service"]["emitter"].sendAction({
                event: "request:create-signer",
                data: createSignerData,
                responseEvent: "response:create-signer",
            });

            // Extract the request ID from the response
            const id = response.requestId;
            setRequestId(id);

            addLog(`Create signer request successful! Request ID: ${id}`);
        } catch (error) {
            console.error("Failed to create signer", error);
            setErrorMessage((error as Error).message);
            addLog(`Error creating signer: ${(error as Error).message}`);
        } finally {
            setIsLoading((prev) => ({ ...prev, createSigner: false }));
        }
    };

    // Send OTP code for verification
    const sendOtp = async () => {
        if (!signer || !requestId) {
            addLog("Signer or request ID not available. Please create a signer first.");
            return;
        }

        if (!otpCode) {
            addLog("Please enter an OTP code.");
            return;
        }

        try {
            setIsLoading((prev) => ({ ...prev, sendOtp: true }));
            addLog(`Sending OTP code for request ID: ${requestId}...`);

            // Using the internal service to send the send-otp request
            const response = await signer["service"]["emitter"].sendAction({
                event: "request:send-otp",
                data: {
                    otp: otpCode,
                    requestId: requestId,
                },
                responseEvent: "response:send-otp",
            });

            // Update OTP status based on the response
            const success = response.success;
            setOtpStatus(success ? "success" : "failed");
            addLog(`OTP verification ${success ? "successful" : "failed"}!`);
        } catch (error) {
            console.error("Failed to verify OTP", error);
            setErrorMessage((error as Error).message);
            addLog(`Error verifying OTP: ${(error as Error).message}`);
            setOtpStatus("failed");
        } finally {
            setIsLoading((prev) => ({ ...prev, sendOtp: false }));
        }
    };

    return (
        <div className="container mx-auto py-10">
            <h1 className="text-2xl font-bold mb-6">Solana iFrame Signer Test</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Signer Controls */}
                <Card>
                    <CardHeader>
                        <CardTitle>iFrame Signer Controls</CardTitle>
                        <CardDescription>Manage the Solana iFrame Signer</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {/* Status */}
                            <div>
                                <p className="text-sm font-medium mb-1">Status</p>
                                <div>
                                    {signerStatus === "not-initialized" && (
                                        <Badge variant="outline">Not Initialized</Badge>
                                    )}
                                    {signerStatus === "initializing" && (
                                        <Badge variant="secondary">Initializing...</Badge>
                                    )}
                                    {signerStatus === "initialized" && <Badge variant="secondary">Initialized</Badge>}
                                    {signerStatus === "connected" && (
                                        <Badge className="bg-green-500 text-white">Connected</Badge>
                                    )}
                                    {signerStatus === "error" && <Badge variant="destructive">Error</Badge>}
                                </div>
                            </div>

                            {/* Public Key */}
                            <div>
                                <p className="text-sm font-medium mb-1">Public Key</p>
                                {publicKey ? (
                                    <code className="text-xs bg-slate-100 dark:bg-slate-800 rounded p-1 block overflow-hidden">
                                        {publicKey}
                                    </code>
                                ) : (
                                    <p className="text-xs text-slate-500">No public key available</p>
                                )}
                            </div>

                            {/* Request ID */}
                            <div>
                                <p className="text-sm font-medium mb-1">Signer Request ID</p>
                                {requestId ? (
                                    <code className="text-xs bg-slate-100 dark:bg-slate-800 rounded p-1 block overflow-hidden">
                                        {requestId}
                                    </code>
                                ) : (
                                    <p className="text-xs text-slate-500">No request ID available</p>
                                )}
                            </div>

                            {/* OTP Status */}
                            {requestId && (
                                <div>
                                    <p className="text-sm font-medium mb-1">OTP Verification</p>
                                    <div className="flex space-x-2 mb-2">
                                        <Input
                                            type="text"
                                            placeholder="Enter OTP code"
                                            value={otpCode}
                                            onChange={(e) => setOtpCode(e.target.value)}
                                            className="flex-1"
                                        />
                                        <Button onClick={sendOtp} disabled={isLoading.sendOtp || !otpCode} size="sm">
                                            {isLoading.sendOtp ? (
                                                <>
                                                    <Loader />
                                                    Verifying...
                                                </>
                                            ) : (
                                                "Verify OTP"
                                            )}
                                        </Button>
                                    </div>
                                    {otpStatus === "success" && (
                                        <Badge className="bg-green-500 text-white">OTP Verified</Badge>
                                    )}
                                    {otpStatus === "failed" && <Badge variant="destructive">OTP Failed</Badge>}
                                </div>
                            )}

                            {/* Smart Wallet */}
                            <div>
                                <p className="text-sm font-medium mb-1">Smart Wallet</p>
                                {smartWallet.address ? (
                                    <code className="text-xs bg-slate-100 dark:bg-slate-800 rounded p-1 block overflow-hidden">
                                        {smartWallet.address}
                                    </code>
                                ) : (
                                    <p className="text-xs text-slate-500">No smart wallet created</p>
                                )}
                            </div>

                            {/* Error Message */}
                            {errorMessage && (
                                <Alert variant="destructive">
                                    <AlertTitle>Error</AlertTitle>
                                    <AlertDescription>{errorMessage}</AlertDescription>
                                </Alert>
                            )}
                        </div>
                    </CardContent>
                    <CardFooter className="flex flex-col space-y-2">
                        <div className="grid grid-cols-1 gap-2 w-full">
                            <Button
                                onClick={createSigner}
                                disabled={
                                    isLoading.createSigner || signerStatus !== "initialized" || requestId !== null
                                }
                                className="w-full bg-purple-600 hover:bg-purple-700"
                            >
                                {isLoading.createSigner ? (
                                    <>
                                        <Loader />
                                        Creating Signer...
                                    </>
                                ) : requestId ? (
                                    "Signer Created"
                                ) : (
                                    "Create Signer"
                                )}
                            </Button>
                            <Button
                                onClick={getPublicKey}
                                disabled={
                                    isLoading.publicKey ||
                                    (signerStatus !== "initialized" && signerStatus !== "connected") ||
                                    !requestId ||
                                    otpStatus !== "success"
                                }
                                className="w-full"
                            >
                                {isLoading.publicKey ? (
                                    <>
                                        <Loader />
                                        Getting...
                                    </>
                                ) : (
                                    "Get Signer Public Key"
                                )}
                            </Button>
                        </div>
                        <Button
                            onClick={createWallet}
                            disabled={
                                isLoading.createWallet ||
                                signerStatus !== "connected" ||
                                smartWallet.status === "created" ||
                                !requestId ||
                                otpStatus !== "success"
                            }
                            className="w-full bg-indigo-600 hover:bg-indigo-700"
                        >
                            {isLoading.createWallet ? (
                                <>
                                    <Loader />
                                    Creating Wallet...
                                </>
                            ) : smartWallet.status === "created" ? (
                                "Wallet Created"
                            ) : (
                                "Create Smart Wallet"
                            )}
                        </Button>
                        <Button
                            onClick={() =>
                                sendTransaction(
                                    new VersionedTransaction(
                                        new TransactionMessage({
                                            payerKey: smartWallet.wallet!.publicKey,
                                            recentBlockhash: "11111111111111111111111111111111",
                                            instructions: [createMemoInstruction("Hello, Solana!")],
                                        }).compileToV0Message()
                                    )
                                )
                            }
                            disabled={isLoading.sendTransaction || !smartWallet.wallet || !requestId}
                            className="w-full bg-green-600 hover:bg-green-700"
                        >
                            {isLoading.sendTransaction ? (
                                <>
                                    <Loader />
                                    Sending Transaction...
                                </>
                            ) : (
                                "Send Transaction"
                            )}
                        </Button>
                        <Button
                            onClick={cleanupSigner}
                            disabled={signerStatus === "not-initialized"}
                            variant="outline"
                            className="w-full"
                        >
                            Reset Signer
                        </Button>
                        <Button onClick={() => setIsDebugMode(!isDebugMode)} variant="outline" className="w-full">
                            {isDebugMode ? "Hide Debug View" : "Show Debug View"}
                        </Button>
                    </CardFooter>
                </Card>

                {/* Logs */}
                <Card>
                    <CardHeader>
                        <CardTitle>Activity Logs</CardTitle>
                        <CardDescription>See what&apos;s happening with the signer</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div
                            className="h-[400px] overflow-y-auto border rounded-md p-2 text-sm"
                            style={{ fontFamily: "monospace" }}
                        >
                            {logs.length === 0 ? (
                                <p className="text-slate-500">No activity yet.</p>
                            ) : (
                                logs.map((log, index) => (
                                    <div
                                        key={index}
                                        className="border-b border-slate-100 last:border-0 pb-1 mb-1 last:mb-0"
                                    >
                                        {log}
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Only show iframe preview in debug mode */}
            {isDebugMode && (
                <Card className="mt-6">
                    <CardHeader>
                        <CardTitle>iFrame Preview (Debug Mode)</CardTitle>
                        <CardDescription>Live view of the Solana signer iframe</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="border rounded-lg overflow-hidden" style={{ height: "300px" }}>
                            {iframeUrl && (
                                <iframe
                                    src={iframeUrl}
                                    className="w-full h-full"
                                    id={IFRAME_ID}
                                    title="Solana Signer iframe"
                                />
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
