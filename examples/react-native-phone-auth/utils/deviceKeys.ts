import AsyncStorage from '@react-native-async-storage/async-storage';

export interface DeviceKeyPair {
    publicKey: CryptoKey;
    privateKey: CryptoKey;
}

export const generateDeviceId = (): string => {
    return `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Generates ECDH P-256 key pair for device encryption
 * 
 * This function creates a cryptographic key pair using the ECDH algorithm with P-256 curve,
 * which is required for secure communication with the NCS (Non-Custodial Signer) system.
 * The private key is securely stored in AsyncStorage for later use.
 * 
 * @returns Promise<DeviceKeyPair> - Object containing both public and private keys
 * @throws Error if key generation or storage fails
 * 
 * @example
 * ```typescript
 * const { publicKey, privateKey } = await generateDeviceKeys();
 * const publicKeyJWK = await exportPublicKey(publicKey);
 * // Use publicKeyJWK in API calls
 * ```
 */
export const generateDeviceKeys = async (): Promise<DeviceKeyPair> => {
    try {
        console.log('Generating ECDH P-256 device key pair...');
        
        const keyPair = await crypto.subtle.generateKey(
            {
                name: 'ECDH',
                namedCurve: 'P-256'
            },
            true, // extractable - allows exporting keys
            ['deriveKey', 'deriveBits'] // key usages for ECDH operations
        );
        
        const privateKeyJWK = await crypto.subtle.exportKey('jwk', keyPair.privateKey);
        await AsyncStorage.setItem('devicePrivateKey', JSON.stringify(privateKeyJWK));
        
        await AsyncStorage.setItem('deviceKeyTimestamp', Date.now().toString());
        
        console.log('Device keys generated and stored successfully');
        
        return {
            publicKey: keyPair.publicKey,
            privateKey: keyPair.privateKey
        };
    } catch (error) {
        console.error('Failed to generate device keys:', error);
        throw new Error(`Device key generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
};

export const getStoredDeviceKey = async (): Promise<CryptoKey> => {
    try {
        const privateKeyJWK = await AsyncStorage.getItem('devicePrivateKey');
        if (!privateKeyJWK) {
            throw new Error('No stored device key found');
        }
        
        const keyData = JSON.parse(privateKeyJWK);
        return await crypto.subtle.importKey(
            'jwk',
            keyData,
            {
                name: 'ECDH',
                namedCurve: 'P-256'
            },
            true,
            ['deriveKey', 'deriveBits']
        );
    } catch (error) {
        console.error('Failed to retrieve stored device key:', error);
        throw new Error('Device key retrieval failed');
    }
};

export const exportPublicKey = async (publicKey: CryptoKey): Promise<JsonWebKey> => {
    try {
        return await crypto.subtle.exportKey('jwk', publicKey);
    } catch (error) {
        console.error('Failed to export public key:', error);
        throw new Error('Public key export failed');
    }
};
