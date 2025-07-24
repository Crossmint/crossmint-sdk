import React, { useEffect, useCallback } from 'react';
import { useCrossmint } from '@crossmint/client-sdk-react-native-ui';

interface AuthSetupProps {
    authState: {
        user: {
            uid: string;
            email?: string;
        } | null;
        phoneNumber: string | null;
    };
    firebaseJWT: string | null;
}

const AuthSetup: React.FC<AuthSetupProps> = ({ authState, firebaseJWT }) => {
    const { experimental_setCustomAuth } = useCrossmint();
    
    const validatePhoneNumber = useCallback((phone: string): boolean => {
        const e164Regex = /^\+[1-9]\d{1,14}$/;
        return e164Regex.test(phone);
    }, []);
    
    const formatPhoneNumber = useCallback((phone: string): string => {
        let formattedPhone = phone.startsWith('+') ? phone : `+${phone}`;
        
        formattedPhone = '+' + formattedPhone.slice(1).replace(/\D/g, '');
        
        return formattedPhone;
    }, []);
    
    const validateJWT = useCallback((jwt: string): boolean => {
        const jwtParts = jwt.split('.');
        return jwtParts.length === 3 && jwtParts.every(part => part.length > 0);
    }, []);
    
    useEffect(() => {
        if (authState.user && authState.phoneNumber && firebaseJWT) {
            try {
                if (!validateJWT(firebaseJWT)) {
                    console.error('Invalid JWT format provided');
                    return;
                }
                
                const formattedPhone = formatPhoneNumber(authState.phoneNumber);
                
                if (!validatePhoneNumber(formattedPhone)) {
                    console.error('Invalid phone number format:', formattedPhone);
                    return;
                }
                
                experimental_setCustomAuth({
                    jwt: firebaseJWT,
                    phone: formattedPhone, // Must include + prefix: "+17542441148"
                });
                
                console.log('Custom auth set successfully with phone:', formattedPhone);
                
            } catch (error) {
                console.error('Failed to set custom auth:', error);
            }
        } else {
            console.log('Clearing custom auth - missing required data');
        }
    }, [authState.user, authState.phoneNumber, firebaseJWT, experimental_setCustomAuth, validatePhoneNumber, formatPhoneNumber, validateJWT]);
    
    return null;
};

export default AuthSetup;
