# React Native Phone Authentication Example

This directory contains example implementations for phone OTP authentication with Crossmint SDK in React Native.

## Files Overview

- `AuthSetup.tsx` - Component for setting up experimental_customAuth with phone number
- `hooks/useApiClient.ts` - Hook for creating the Crossmint API client
- `hooks/usePhoneOnboarding.ts` - Complete phone onboarding flow implementation
- `components/PhoneOTPModal.tsx` - UI component for OTP input
- `utils/deviceKeys.ts` - Device key generation utilities
- `services/onboardingService.ts` - NCS onboarding API service

## Installation

These are example files meant to be copied into your React Native project. Make sure you have the following dependencies:

```bash
npm install @crossmint/client-sdk-react-native-ui
npm install react-native-crypto # For cryptographic operations
npm install @react-native-async-storage/async-storage # For secure storage
```

## Usage

1. Copy the relevant files to your React Native project
2. Import and use the `AuthSetup` component in your main App component:

```typescript
import AuthSetup from './path/to/AuthSetup';

const App = () => {
    const [authState, setAuthState] = useState({
        user: null,
        phoneNumber: null
    });
    const [firebaseJWT, setFirebaseJWT] = useState(null);
    
    // Your Firebase auth logic here
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                const jwt = await user.getIdToken();
                setAuthState({
                    user: { uid: user.uid, email: user.email },
                    phoneNumber: user.phoneNumber
                });
                setFirebaseJWT(jwt);
            }
        });
        return unsubscribe;
    }, []);
    
    return (
        <CrossmintProvider apiKey={apiKey}>
            <CrossmintWalletProvider>
                <AuthSetup authState={authState} firebaseJWT={firebaseJWT} />
                {/* Your app content */}
            </CrossmintWalletProvider>
        </CrossmintProvider>
    );
};
```

3. Use the `usePhoneOnboarding` hook in components that need phone authentication
4. Customize the UI components to match your app's design

## Important Notes

- Phone numbers must be in E.164 format (e.g., "+17542441148")
- Firebase JWT tokens are required for authentication
- Device keys should be stored securely using React Native's secure storage
- This implementation requires additional cryptographic libraries for full functionality
