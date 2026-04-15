"use client";

import { useWallet } from "@crossmint/client-sdk-react-ui";
import { EVMWallet, SolanaWallet, StellarWallet } from "@crossmint/wallets-sdk";
import { useState } from "react";
import { Connection, PublicKey, SystemProgram, TransactionMessage, VersionedTransaction } from "@solana/web3.js";

function isEvm(chain: string) {
    return !chain.startsWith("solana") && !chain.startsWith("stellar");
}

export function ChainTest() {
    const { wallet } = useWallet();
    const [result, setResult] = useState("");
    const [loading, setLoading] = useState("");

    if (wallet == null) return null;

    const run = async (label: string, fn: () => Promise<string>) => {
        setLoading(label);
        setResult("");
        try {
            const res = await fn();
            setResult(`${label}: ${res}`);
        } catch (e: any) {
            setResult(`${label} error: ${e.message ?? e}`);
        } finally {
            setLoading("");
        }
    };

    const evmSendTx = () =>
        run("sendTransaction", async () => {
            const evmWallet = EVMWallet.from(wallet);
            const { explorerLink } = await evmWallet.sendTransaction({
                to: "0x0D282906CDD8F6934d60E4dCAa79fa5B1c7a1925",
                value: BigInt(0),
                data: "0x",
            });
            return explorerLink ?? "sent (no explorer link)";
        });

    const evmSignMessage = () =>
        run("signMessage", async () => {
            const evmWallet = EVMWallet.from(wallet);
            const res = await evmWallet.signMessage({ message: "Hello from Crossmint!" });
            return JSON.stringify(res);
        });

    const evmSignTypedData = () =>
        run("signTypedData", async () => {
            const evmWallet = EVMWallet.from(wallet);
            const res = await evmWallet.signTypedData({
                chain: wallet.chain as any,
                types: {
                    Person: [{ name: "name", type: "string" }],
                    Mail: [
                        { name: "from", type: "Person" },
                        { name: "to", type: "Person" },
                        { name: "contents", type: "string" },
                    ],
                },
                primaryType: "Mail",
                domain: {
                    name: "example.com",
                    version: "1",
                    chainId: 84532,
                    verifyingContract: "0x0000000000000000000000000000000000000001",
                },
                message: {
                    from: {
                        name: "John Doe",
                    },
                    to: {
                        name: "Jane Doe",
                    },
                    contents: "Hello, world!",
                },
            });
            return JSON.stringify(res);
        });

    const solanaSendTx = () =>
        run("sendTransaction", async () => {
            const connection = new Connection("https://api.devnet.solana.com");
            const walletPubkey = new PublicKey(wallet.address);
            const { blockhash } = await connection.getLatestBlockhash();
            const message = new TransactionMessage({
                payerKey: walletPubkey,
                recentBlockhash: blockhash,
                instructions: [
                    SystemProgram.transfer({
                        fromPubkey: walletPubkey,
                        toPubkey: walletPubkey,
                        lamports: 0,
                    }),
                ],
            }).compileToV0Message();
            const transaction = new VersionedTransaction(message);
            const solanaWallet = SolanaWallet.from(wallet);
            const res = await solanaWallet.sendTransaction({ transaction });
            return res.explorerLink ?? "sent (no explorer link)";
        });

    const stellarSendTx = () =>
        run("sendTransaction", async () => {
            const stellarWallet = StellarWallet.from(wallet);
            const res = await stellarWallet.sendTransaction({
                contractId: "CCL3QAGNIJA7YOIDD4BELFN4DQSVT4YF3DPJHR2GABK7OJUDMYAVZA4V",
                method: "hello_requires_auth",
                args: { caller: wallet.address },
            });
            return JSON.stringify(res);
        });

    const chain = wallet.chain;

    return (
        <div className="xm-card xm-card--nested">
            <p className="xm-label">Chain Test ({chain})</p>
            <div className="xm-flex xm-flex--gap-sm xm-mt-sm" style={{ flexWrap: "wrap" }}>
                {isEvm(chain) && (
                    <>
                        <button className="xm-btn xm-btn--secondary" onClick={evmSendTx} disabled={!!loading}>
                            {loading === "sendTransaction" ? "Sending..." : "Send Tx"}
                        </button>
                        <button className="xm-btn xm-btn--secondary" onClick={evmSignMessage} disabled={!!loading}>
                            {loading === "signMessage" ? "Signing..." : "Sign Message"}
                        </button>
                        <button className="xm-btn xm-btn--secondary" onClick={evmSignTypedData} disabled={!!loading}>
                            {loading === "signTypedData" ? "Signing..." : "Sign Typed Data"}
                        </button>
                    </>
                )}
                {chain.startsWith("solana") && (
                    <button className="xm-btn xm-btn--secondary" onClick={solanaSendTx} disabled={!!loading}>
                        {loading === "sendTransaction" ? "Sending..." : "Send Tx"}
                    </button>
                )}
                {chain.startsWith("stellar") && (
                    <button className="xm-btn xm-btn--secondary" onClick={stellarSendTx} disabled={!!loading}>
                        {loading === "sendTransaction" ? "Sending..." : "Send Tx"}
                    </button>
                )}
            </div>
            {result && (
                <pre
                    className="xm-mt-sm"
                    style={{
                        fontSize: 11,
                        maxHeight: 120,
                        overflow: "auto",
                        background: "#F7F8FA",
                        padding: 8,
                        borderRadius: 6,
                        wordBreak: "break-all",
                        whiteSpace: "pre-wrap",
                    }}
                >
                    {result}
                </pre>
            )}
        </div>
    );
}
