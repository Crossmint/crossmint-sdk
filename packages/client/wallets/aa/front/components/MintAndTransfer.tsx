import React, { useState } from 'react';
import styles from "../styles/index.module.css"; 
import { EVMAAWallet } from "@crossmint/client-sdk-aa";
import { mintAndTransferERC20, mintAndTransferERC721, mintAndTransferERC1155 } from '@/services/walletService';

interface MintAndTransferComponentProps {
    aaWallet: EVMAAWallet | undefined;
}

const MintAndTransferComponent:  React.FC<MintAndTransferComponentProps> = ({ aaWallet }) => {
    const [transferERC721Hash, setTransferERC721Hash] = useState('');
    const [transferERC1155Hash, setTransferERC1155Hash] = useState('');
    const [transferERC20Hash, setTransferERC20Hash] = useState('');

    const handleTransferERC721 = async () => {
        if (!aaWallet) {
            console.log("AAWallet not defined");
            return;
        }
        const hash = await mintAndTransferERC721(aaWallet);
        setTransferERC721Hash(hash);
    };

    const handleTransferERC1155 = async () => {
        if (!aaWallet) {
            console.log("AAWallet not defined");
            return;
        }
        const hash = await mintAndTransferERC1155(aaWallet);
        setTransferERC1155Hash(hash);
    };

    const handleTransferERC20 = async () => {
        if (!aaWallet) {
            console.log("AAWallet not defined");
            return;
        }
        const hash = await mintAndTransferERC20(aaWallet);
        setTransferERC20Hash(hash);
    };

    return (
        <div className={styles.container}>
            <section className={styles.section}>
                <h2 className={styles.title}>Mint & Transfer</h2>
                <div>
                    <button className={styles.button} onClick={handleTransferERC721}>
                        Execute Transfer ERC721
                    </button>
                    <input
                        className={styles.input}
                        value={transferERC721Hash}
                        readOnly
                    />
                </div>
                <div>
                    <button className={styles.button} onClick={handleTransferERC1155}>
                        Execute Transfer ERC1155
                    </button>
                    <input
                        className={styles.input}
                        value={transferERC1155Hash}
                        readOnly
                    />
                </div>
                <div>
                    <button className={styles.button} onClick={handleTransferERC20}>
                        Execute Transfer ERC20
                    </button>
                    <input
                        className={styles.input}
                        value={transferERC20Hash}
                        readOnly
                    />
                </div>
            </section>
        </div>
    );
};

export default MintAndTransferComponent;
