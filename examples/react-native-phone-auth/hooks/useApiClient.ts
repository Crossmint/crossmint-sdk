import { useMemo } from 'react';
import { createCrossmintApiClient } from '@crossmint/client-sdk-react-native-ui';
import { useCrossmint } from '@crossmint/client-sdk-react-native-ui';

export const useApiClient = () => {
    const { crossmint } = useCrossmint();
    
    const apiClient = useMemo(() => {
        return createCrossmintApiClient(crossmint);
    }, [crossmint]);
    
    return apiClient;
};
