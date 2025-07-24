import AsyncStorage from '@react-native-async-storage/async-storage';

export interface DeviceKeyPair {
    publicKey: CryptoKey;
    privateKey: CryptoKey;
}

export const generateDeviceId = (): string => {
    return `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const generateDeviceKeys = async (): Promise<DeviceKeyPair> => {
    try {
        const keyPair = await crypto.subtle.generateKey(
            {
                name: 'ECDH',
                namedCurve: 'P-256'
            },
            true, // extractable
            ['deriveKey', 'deriveBits']
        );
        
        const privateKeyJWK = await crypto.subtle.exportKey('jwk', keyPair.privateKey);
        await AsyncStorage.setItem('devicePrivateKey', JSON.stringify(privateKeyJWK));
        
        return {
            publicKey: keyPair.publicKey,
            privateKey: keyPair.privateKey
        };
    } catch (error) {
        console.error('Failed to generate device keys:', error);
        throw new Error('Device key generation failed');
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
