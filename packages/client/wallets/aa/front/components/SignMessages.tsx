import React, { useState } from 'react';
import styles from '../styles/index.module.css';
import { EVMAAWallet } from "@crossmint/client-sdk-aa";
import { signMessage, signTypedData, verifyMessage } from '@/services/walletService';

interface SignComponentProps {
    aaWallet: EVMAAWallet | undefined;
}

const SignComponent: React.FC<SignComponentProps> = ({ aaWallet }) => {
    const [messageToSign, setMessageToSign] = useState('');
    const [signMessageSignature, setSignMessageSignature] = useState('');
    const [messageToVerify, setMessageToVerify] = useState('');
    const [messageSignature, setMessageSignature] = useState('');
    const [isMessageVerified, setIsMessageVerified] = useState(false);
    const [signTypedDataHash, setSignTypedDataHash] = useState('');

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

    return (
        <div className={styles.container}>
            <section className={styles.section}>
                <h2 className={styles.title}>Sign / Verify Message</h2>
                <div>
                    <input
                        className={styles.input}
                        type="text"
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
                        type="text"
                        placeholder="Message to verify"
                        value={messageToVerify}
                        onChange={(e) => setMessageToVerify(e.target.value)}
                    />
                    <input
                        className={styles.input}
                        type="text"
                        placeholder="Signature"
                        value={messageSignature}
                        onChange={(e) => setMessageSignature(e.target.value)}
                    />
                    <button className={styles.button}  data-testid="VerifyMessageBtn" onClick={handleVerifyMessage}>
                        Verify message
                    </button>
                    <input
                        className={styles.input}
                        type="text"
                        value={isMessageVerified ? "Verified" : "Not verified"}
                        data-testid="VerifyMessageInput"
                        readOnly
                    />
                </div>
                <div>
                    <h3 className={styles.title}>Sign Typed Data</h3>
                    <button className={styles.button} data-testid="SignedTypedData" onClick={handleSignTypedData}>
                        Sign Typed Data
                    </button>
                    <input className={styles.input} type="text" data-testid="SignTypedDataInput" value={signTypedDataHash} readOnly />
                </div>
            </section>
        </div>
    );
};

export default SignComponent;
