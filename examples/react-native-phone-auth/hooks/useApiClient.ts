import { useMemo } from 'react';
import { createCrossmintApiClient } from '@crossmint/client-sdk-react-native-ui';
import { useCrossmint } from '@crossmint/client-sdk-react-native-ui';

/**
 * Custom hook that creates and returns a configured CrossmintApiClient instance
 * 
 * This hook uses the createCrossmintApiClient utility to create an API client
 * that is properly configured with the crossmint context from the provider.
 * The client can be used to make direct API calls to Crossmint services,
 * including NCS onboarding endpoints.
 * 
 * @returns CrossmintApiClient instance configured with the current crossmint context
 * 
 * @example
 * ```typescript
 * const MyComponent = () => {
 *     const apiClient = useApiClient();
 *     
 *     const makeApiCall = async () => {
 *         const response = await apiClient.post('/api/ncs/v1/signers/start-onboarding', {
 *             body: JSON.stringify({ deviceId, authId }),
 *             headers: { 'Content-Type': 'application/json' }
 *         });
 *     };
 * };
 * ```
 */
export const useApiClient = () => {
    const { crossmint } = useCrossmint();
    
    const apiClient = useMemo(() => {
        if (!crossmint) {
            throw new Error('CrossmintApiClient requires crossmint context. Ensure component is wrapped with CrossmintProvider.');
        }
        
        return createCrossmintApiClient(crossmint);
    }, [crossmint]);
    
    return apiClient;
};
