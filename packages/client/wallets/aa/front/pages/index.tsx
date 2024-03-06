import {
    getOrCreateWalletEthers,
    getOrCreateWalletFireblocks,
    sendTransaction,
    setCustodianForKillSwitch,
    setCustodianForTokens,
    signMessage,
    signTypedData,
    verifyMessage,
} from "@/services/walletService";
import { useState } from "react";

import { EVMAAWallet } from "@crossmint/client-sdk-aa";

import styles from "../styles/index.module.css";

export default function WalletPage() {
    const [messageToSign, setMessageToSign] = useState("");
    const [signMessageSignature, setSignMessageSignature] = useState("");

    const [messageToVerify, setMessageToVerify] = useState("");
    const [messageSignature, setMessageSignature] = useState("");
    const [isMessageVerified, setIsMessageVerified] = useState(false);

    const [signTypedDataHash, setSignTypedDataHash] = useState("");

    const [sendTransactionTxHash, setSendTransactionTxHash] = useState("");

    const [aaWallet, setAAWallet] = useState<EVMAAWallet | undefined>();

    const [email, setEmail] = useState("");
    const [privateKey, setPrivateKey] = useState("");
    const [walletAddress, setWalletAddress] = useState("");

    const [emailFireblocks, setEmailFireblocks] = useState("");
    const [walletAddressFireblocks, setWalletAddressFireblocks] = useState("");

    const handleCreateWalletEthers = async () => {
        if (!email || !privateKey) {
            console.log("Input 'email' and 'privateKey' values");
            return;
        }
        console.log("Creating wallet");
        const aaWallet = await getOrCreateWalletEthers(email, privateKey);
        console.log({ aaWallet });
        setAAWallet(aaWallet);
        setWalletAddress(await aaWallet.getAddress());
    };

    const handleCreateWalletFireblocks = async () => {
        if (!emailFireblocks) {
            console.log("Input 'email' value");
            return;
        }
        console.log("Creating wallet");
        const aaWallet = await getOrCreateWalletFireblocks(emailFireblocks);
        console.log({ aaWallet });
        setAAWallet(aaWallet);
        setWalletAddressFireblocks(await aaWallet.getAddress());
    };

    const handleSendTransaction = async () => {
        if (aaWallet) {
            const tx = {
                to: "0x3DdfBa136f0ca9E430ac444Aa426928E5088c03A",
                value: "0x00",
            };
            const txHash = await sendTransaction(aaWallet, tx);
            console.log({ sendTransaction_txHash: txHash });
            setSendTransactionTxHash(txHash);
        } else {
            console.log("AAWallet not defined");
        }
    };

    const handleSignTypedData = async () => {
        if (aaWallet) {
            const params = {
                primaryType: "ValidatorApproved",
                message: {
                    sig: "0x1888bfd7",
                    validatorData: "1286154452161992304311869645070421180087210148582",
                    executor: "0x2087C7FfD0d0DAE80a00EE74325aBF3449e0eaf1",
                    enableData:
                        "0x902588bbC55727dAa4224f5D6056ba939534efcD80ac58cd1888bfd700000000000000000000000000000010",
                },
                types: {
                    ValidatorApproved: [
                        { name: "sig", type: "bytes4" },
                        { name: "validatorData", type: "uint256" },
                        { name: "executor", type: "address" },
                        { name: "enableData", type: "bytes" },
                    ],
                },
            };
            const txHash = await signTypedData(aaWallet, params);
            console.log({ signTypedDataHash: txHash });
            setSignTypedDataHash(txHash);
        } else {
            console.log("AAWallet not defined");
        }
    };

    const handleSignMessage = async () => {
        if (aaWallet) {
            const tx = await signMessage(aaWallet, messageToSign);
            console.log({ signMessage_txHash: tx });
            setSignMessageSignature(tx);
        } else {
            console.log("AAWallet not defined");
        }
    };

    const handleVerifyMessage = async () => {
        if (aaWallet) {
            const verified = await verifyMessage(aaWallet, messageToVerify, messageSignature);
            console.log({ verified });
            setIsMessageVerified(verified);
        } else {
            console.log("AAWallet not defined");
        }
    };

    const handleSetCustodianKillSwitch = async () => {
        if (aaWallet) await setCustodianForKillSwitch(aaWallet);
        else console.log("AAWallet not defined");
    };

    const handleSetCustodianTransfer = async () => {
        if (aaWallet) await setCustodianForTokens(aaWallet);
        else console.log("AAWallet not defined");
    };

    return (
        <div>
            <div className={styles.container}>
                <section className={styles.section}>
                    <h2 className={styles.title}>Get / Create</h2>
                    <div>
                        <h3 className={styles.title}>Ethers</h3>
                        <input
                            className={styles.input}
                            type="email"
                            placeholder="Email for ethers"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                        <input
                            className={styles.input}
                            placeholder="Private key"
                            value={privateKey}
                            onChange={(e) => setPrivateKey(e.target.value)}
                        />
                        <button className={styles.button} onClick={handleCreateWalletEthers}>
                            Create wallet
                        </button>
                        <input
                            className={styles.input}
                            type="text"
                            value={walletAddress}
                            data-testid="createdOrGotWallet"
                            readOnly
                        />
                    </div>
                    <div>
                        <h3 className={styles.title}>Fireblocks</h3>
                        <input
                            className={styles.input}
                            type="email"
                            placeholder="Email for Fireblocks"
                            value={emailFireblocks}
                            onChange={(e) => setEmailFireblocks(e.target.value)}
                        />
                        <button className={styles.button} onClick={handleCreateWalletFireblocks}>
                            Create Fireblocks wallet
                        </button>
                        <input
                            className={styles.input}
                            type="text"
                            value={walletAddressFireblocks}
                            data-testid="createdOrGotFireblocksWallet"
                            readOnly
                        />
                    </div>
                </section>
            </div>

            <div className={styles.container}>
                <section className={styles.section}>
                    <h2 className={styles.title}>Custodians</h2>
                    <button className={styles.button} onClick={handleSetCustodianKillSwitch}>
                        KillSwitch
                    </button>
                    <button className={styles.button} onClick={handleSetCustodianTransfer}>
                        Tokens
                    </button>
                </section>
            </div>

            <div className={styles.container}>
                <section className={styles.section}>
                    <h2 className={styles.title}>Wallet actions</h2>
                    <div>
                        <h3 className={styles.title}>Sign / Verify message</h3>
                        <div>
                            <input
                                className={styles.input}
                                type="message"
                                placeholder="Message to sign"
                                value={messageToSign}
                                onChange={(e) => setMessageToSign(e.target.value)}
                            />
                            <button className={styles.button} onClick={handleSignMessage}>
                                Sign Message
                            </button>
                            <input
                                className={styles.input}
                                type="text"
                                value={signMessageSignature}
                                data-testid="signedMessageInput"
                                readOnly
                            />
                        </div>
                        <div>
                            <input
                                className={styles.input}
                                type="messageVerify"
                                placeholder="Message to verify"
                                value={messageToVerify}
                                onChange={(e) => setMessageToVerify(e.target.value)}
                            />
                            <input
                                className={styles.input}
                                type="signature"
                                placeholder="Signature"
                                value={messageSignature}
                                onChange={(e) => setMessageSignature(e.target.value)}
                            />
                            <button className={styles.button} onClick={handleVerifyMessage} data-testid="VerifyMessageBtn">
                                Verify message
                            </button>
                            <input
                                className={styles.input}
                                type="text"
                                value={isMessageVerified ? "Verified" : "Not verified"}
                                data-testid="verifiedMessageOutput"
                                readOnly
                            />
                        </div>
                    </div>
                    <div>
                        <h3 className={styles.title}>Sign Typed Data</h3>
                        <button className={styles.button} onClick={handleSignTypedData}>
                            Sign Typed Data
                        </button>
                        <input className={styles.input} type="text" value={signTypedDataHash} data-testid="SignedTypedData" readOnly />
                    </div>
                    <div>
                        <h3 className={styles.title}>Send transaction</h3>
                        <button className={styles.button} onClick={handleSendTransaction}>
                            Send transaction
                        </button>
                        <input
                            className={styles.input}
                            type="text"
                            value={sendTransactionTxHash}
                            data-testid="sendTransactionTxHashInput"
                            readOnly
                        />
                    </div>
                </section>
            </div>
        </div>
    );
}
