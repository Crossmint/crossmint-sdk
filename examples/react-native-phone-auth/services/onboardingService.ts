import { useApiClient } from '../hooks/useApiClient';
import { generateDeviceId, generateDeviceKeys, exportPublicKey } from '../utils/deviceKeys';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface StartOnboardingParams {
    phoneNumber: string;
    jwt: string;
}

export interface StartOnboardingResponse {
    deviceId: string;
    success: boolean;
}

export interface CompleteOnboardingParams {
    deviceId: string;
    otp: string;
    jwt: string;
}

export interface CompleteOnboardingResponse {
    encryptedMasterSecret: string;
    signerId: string;
    success: boolean;
}

export const useOnboardingService = () => {
    const apiClient = useApiClient();
    
    const startOnboarding = async ({ phoneNumber, jwt }: StartOnboardingParams): Promise<StartOnboardingResponse> => {
        try {
            const deviceId = generateDeviceId();
            const { publicKey } = await generateDeviceKeys();
            const publicKeyJWK = await exportPublicKey(publicKey);
            
            const authId = `phone:${phoneNumber}`; // e.g., "phone:+17542441148"
            
            const response = await apiClient.post('/api/ncs/v1/signers/start-onboarding', {
                body: JSON.stringify({
                    deviceId,
                    authId,
                    encryptionContext: {
                        publicKey: publicKeyJWK
                    }
                }),
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${jwt}`
                }
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Start onboarding failed: ${response.status} - ${errorData.message || 'Unknown error'}`);
            }
            
            await AsyncStorage.setItem('currentDeviceId', deviceId);
            
            console.log('Start onboarding successful for device:', deviceId);
            return { deviceId, success: true };
            
        } catch (error) {
            console.error('Start onboarding error:', error);
            throw error;
        }
    };
    
    const completeOnboarding = async ({ deviceId, otp, jwt }: CompleteOnboardingParams): Promise<CompleteOnboardingResponse> => {
        try {
            const encryptedOtp = otp; // Placeholder - should be FPE encrypted
            
            const response = await apiClient.post('/api/ncs/v1/signers/complete-onboarding', {
                body: JSON.stringify({
                    deviceId,
                    onboardingAuthentication: {
                        encryptedOtp
                    }
                }),
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${jwt}`
                }
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Complete onboarding failed: ${response.status} - ${errorData.message || 'Unknown error'}`);
            }
            
            const result = await response.json();
            
            await AsyncStorage.setItem('encryptedMasterSecret', result.encryptedMasterSecret);
            await AsyncStorage.setItem('signerId', result.signerId);
            
            console.log('Complete onboarding successful for device:', deviceId);
            return {
                encryptedMasterSecret: result.encryptedMasterSecret,
                signerId: result.signerId,
                success: true
            };
            
        } catch (error) {
            console.error('Complete onboarding error:', error);
            throw error;
        }
    };
    
    const isDeviceOnboarded = async (): Promise<boolean> => {
        try {
            const encryptedSecret = await AsyncStorage.getItem('encryptedMasterSecret');
            const signerId = await AsyncStorage.getItem('signerId');
            return !!(encryptedSecret && signerId);
        } catch (error) {
            console.error('Error checking onboarding status:', error);
            return false;
        }
    };
    
    return {
        startOnboarding,
        completeOnboarding,
        isDeviceOnboarded
    };
};
