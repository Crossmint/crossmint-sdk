"use client";

import { useState, useEffect } from "react";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

// Simple Loader component
const Loader = () => (
    <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24">
        <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
        ></circle>
        <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        ></path>
    </svg>
);

// Import from the SDK
import {
    createSolanaIFrameSigner,
    SolanaIFrameSigner,
} from "@crossmint/client-signers";

// Define the iframe ID constant for consistent referencing
const IFRAME_ID = "solana-signer-iframe";

export default function Home() {
    const [signer, setSigner] = useState<SolanaIFrameSigner | null>(null);
    const [publicKey, setPublicKey] = useState<string | null>(null);
    const [signerStatus, setSignerStatus] = useState<
        | "not-initialized"
        | "initializing"
        | "initialized"
        | "connected"
        | "error"
    >("not-initialized");
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [logs, setLogs] = useState<string[]>([]);
    const [iframeUrl, setIframeUrl] = useState<string>("");
    const [isLoading, setIsLoading] = useState<{ [key: string]: boolean }>({
        init: false,
        publicKey: false,
        signMessage: false,
    });

    // Log function
    const addLog = (message: string) => {
        setLogs((prev) => [
            ...prev,
            `[${new Date().toLocaleTimeString()}] ${message}`,
        ]);
    };

    // Initialize the signer
    const initializeSigner = async () => {
        try {
            setIsLoading((prev) => ({ ...prev, init: true }));
            setSignerStatus("initializing");
            addLog("Initializing Solana iFrame signer...");

            // First ensure we have a proper iframe with correct ID
            const iframe = document.getElementById(
                IFRAME_ID
            ) as HTMLIFrameElement;
            if (iframe) {
                addLog(`Found existing iframe with ID: ${IFRAME_ID}`);
            } else {
                addLog(
                    `No iframe found with ID: ${IFRAME_ID}, this may cause issues`
                );
            }

            // Create new signer instance
            const newSigner = createSolanaIFrameSigner(iframeUrl);
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
        const origin = window.location.origin;
        setIframeUrl(`${origin}/iframe`);
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
            if (
                signerStatus !== "initialized" &&
                signerStatus !== "connected"
            ) {
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

    // Sign a message
    const signMessage = async () => {
        if (!signer) {
            addLog("No signer available. Please initialize the signer first.");
            return;
        }

        try {
            setIsLoading((prev) => ({ ...prev, signMessage: true }));
            addLog("Signing message...");

            // Create a simple message to sign
            const message = new TextEncoder().encode("Hello, Solana!");

            // Sign the message
            const signature = await signer.signMessage(message);

            // Convert signature to hex for display
            const signatureHex = Array.from(signature)
                .map((b) => b.toString(16).padStart(2, "0"))
                .join("");

            addLog(
                `Message signed successfully: ${signatureHex.substring(
                    0,
                    20
                )}...`
            );
        } catch (error) {
            console.error("Failed to sign message", error);
            setErrorMessage((error as Error).message);
            addLog(`Error: ${(error as Error).message}`);
        } finally {
            setIsLoading((prev) => ({ ...prev, signMessage: false }));
        }
    };

    // Clean up the signer
    const cleanupSigner = () => {
        if (signer) {
            signer.dispose();
            setSigner(null);
            setPublicKey(null);
            setSignerStatus("not-initialized");
            addLog("Signer disposed");
        }
    };

    return (
        <div className="container mx-auto py-10">
            <h1 className="text-2xl font-bold mb-6">
                Solana iFrame Signer Test
            </h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Signer Controls */}
                <Card>
                    <CardHeader>
                        <CardTitle>iFrame Signer Controls</CardTitle>
                        <CardDescription>
                            Manage the Solana iFrame Signer
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {/* Status */}
                            <div>
                                <p className="text-sm font-medium mb-1">
                                    Status
                                </p>
                                <div>
                                    {signerStatus === "not-initialized" && (
                                        <Badge variant="outline">
                                            Not Initialized
                                        </Badge>
                                    )}
                                    {signerStatus === "initializing" && (
                                        <Badge variant="secondary">
                                            Initializing...
                                        </Badge>
                                    )}
                                    {signerStatus === "initialized" && (
                                        <Badge variant="secondary">
                                            Initialized
                                        </Badge>
                                    )}
                                    {signerStatus === "connected" && (
                                        <Badge className="bg-green-500 text-white">
                                            Connected
                                        </Badge>
                                    )}
                                    {signerStatus === "error" && (
                                        <Badge variant="destructive">
                                            Error
                                        </Badge>
                                    )}
                                </div>
                            </div>

                            {/* Public Key */}
                            <div>
                                <p className="text-sm font-medium mb-1">
                                    Public Key
                                </p>
                                {publicKey ? (
                                    <code className="text-xs bg-slate-100 dark:bg-slate-800 rounded p-1 block overflow-hidden">
                                        {publicKey}
                                    </code>
                                ) : (
                                    <p className="text-xs text-slate-500">
                                        No public key available
                                    </p>
                                )}
                            </div>

                            {/* Error Message */}
                            {errorMessage && (
                                <Alert variant="destructive">
                                    <AlertTitle>Error</AlertTitle>
                                    <AlertDescription>
                                        {errorMessage}
                                    </AlertDescription>
                                </Alert>
                            )}
                        </div>
                    </CardContent>
                    <CardFooter className="flex flex-col space-y-2">
                        <div className="grid grid-cols-1 gap-2 w-full">
                            <Button
                                onClick={getPublicKey}
                                disabled={
                                    isLoading.publicKey ||
                                    (signerStatus !== "initialized" &&
                                        signerStatus !== "connected")
                                }
                                className="w-full"
                            >
                                {isLoading.publicKey ? (
                                    <>
                                        <Loader />
                                        Getting...
                                    </>
                                ) : (
                                    "Get Public Key"
                                )}
                            </Button>
                        </div>
                        <Button
                            onClick={signMessage}
                            disabled={
                                isLoading.signMessage ||
                                signerStatus !== "connected"
                            }
                            className="w-full"
                        >
                            {isLoading.signMessage ? (
                                <>
                                    <Loader />
                                    Signing...
                                </>
                            ) : (
                                "Sign Message"
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
                    </CardFooter>
                </Card>

                {/* Logs */}
                <Card>
                    <CardHeader>
                        <CardTitle>Activity Logs</CardTitle>
                        <CardDescription>
                            See what's happening with the signer
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div
                            className="h-[400px] overflow-y-auto border rounded-md p-2 text-sm"
                            style={{ fontFamily: "monospace" }}
                        >
                            {logs.length === 0 ? (
                                <p className="text-slate-500">
                                    No activity yet.
                                </p>
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

            <Card className="mt-6">
                <CardHeader>
                    <CardTitle>iFrame Preview</CardTitle>
                    <CardDescription>
                        Live view of the Solana signer iframe
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div
                        className="border rounded-lg overflow-hidden"
                        style={{ height: "300px" }}
                    >
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
        </div>
    );
}
