import React, { useEffect } from 'react';
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
    
    useEffect(() => {
        if (authState.user && authState.phoneNumber && firebaseJWT) {
            const formattedPhone = authState.phoneNumber.startsWith('+') 
                ? authState.phoneNumber 
                : `+${authState.phoneNumber}`;
            
            experimental_setCustomAuth({
                jwt: firebaseJWT,
                phone: formattedPhone, // Must include + prefix: "+17542441148"
            });
            
            console.log('Custom auth set with phone:', formattedPhone);
        }
    }, [authState.user, authState.phoneNumber, firebaseJWT, experimental_setCustomAuth]);
    
    return null;
};

export default AuthSetup;
