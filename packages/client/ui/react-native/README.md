# Crossmint React Native SDK

This package provides a React Native UI for integrating Crossmint authentication and wallet functionality into your mobile apps.

## Installation

```bash
pnpm add @crossmint/client-sdk-react-native-ui expo-secure-store expo-web-browser
```

## Authentication with Secure Storage

The React Native SDK uses [Expo's SecureStore](https://docs.expo.dev/versions/latest/sdk/securestore/) for secure, encrypted storage of authentication tokens. This provides a platform-native secure storage solution that encrypts sensitive data on the device.

### Using the Default Secure Storage

The `CrossmintAuthProvider` uses SecureStorage by default:

```tsx
import { CrossmintProvider, CrossmintAuthProvider } from "@crossmint/client-sdk-react-native-ui";

export default function App() {
  return (
    <CrossmintProvider
      apiKey="YOUR_API_KEY"
    >
      <CrossmintAuthProvider>
        {/* Your app content */}
      </CrossmintAuthProvider>
    </CrossmintProvider>
  );
}
```

### Authentication Hooks

Once the providers are set up, you can use the authentication hooks in your components:

```tsx
import { useCrossmintAuth } from "@crossmint/client-sdk-react-native-ui";

function ProfileScreen() {
  const { user, status, logout, login } = useCrossmintAuth();

  if (status === "logged-out") {
    return (
      <View>
        <Button
          title="Sign in with Google"
          onPress={() => login("google")}
        />
      </View>
    );
  }

  return (
    <View>
      <Text>Welcome, {user?.email}</Text>
      <Button title="Logout" onPress={logout} />
    </View>
  );
}
```

## Custom Storage Provider

If you need to implement a custom storage solution, you can implement the `StorageProvider` interface and pass it to the `CrossmintAuthProvider`:

```tsx
import { CrossmintAuthProvider, type StorageProvider } from "@crossmint/client-sdk-react-native-ui";

// Implement your custom storage provider
class CustomStorage implements StorageProvider {
  async get(key: string): Promise<string | undefined> {
    // Your implementation
  }

  async set(key: string, value: string, expiresAt?: string): Promise<void> {
    // Your implementation
  }

  async remove(key: string): Promise<void> {
    // Your implementation
  }
}

// Use your custom storage provider
function App() {
  const customStorage = new CustomStorage();

  return (
    <CrossmintProvider apiKey="YOUR_API_KEY">
      <CrossmintAuthProvider customStorageProvider={customStorage}>
        {/* Your app content */}
      </CrossmintAuthProvider>
    </CrossmintProvider>
  );
}
```

For more detailed documentation, please visit the [Crossmint Developer Docs](https://docs.crossmint.com/).
