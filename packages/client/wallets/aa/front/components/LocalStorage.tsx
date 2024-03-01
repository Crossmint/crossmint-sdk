import React, { useState } from 'react';
import styles from "../styles/index.module.css";
import { purgeData } from '@/services/walletService';

const LocalStorageDataComponent: React.FC = () => {
    const [storageData, setStorageData] = useState('');

    const checkLocalStorage = () => {
        const keys = Object.keys(localStorage);
        const filteredKeys = keys.filter(key => key.startsWith('NCW-'));
        if (filteredKeys.length > 0) {
            setStorageData('Data found in LocalStorage starting with "NCW-".');
        } else {
            setStorageData('No data found in LocalStorage starting with "NCW-".');
        }
    };

    return (
        <div className={styles.container}>
            <section className={styles.section}>
                <h2 className={styles.title}>LocalStorage Data</h2>
                <button className={styles.button} onClick={checkLocalStorage}>
                    Check LocalStorage Data
                </button>
                <button className={styles.button} onClick={ purgeData}>
                    Purge Local Data
                </button>
                <textarea
                    className={styles.input}
                    value={storageData}
                    readOnly
                />
            </section>
        </div>
    );
};

export default LocalStorageDataComponent;
