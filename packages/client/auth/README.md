# @crossmint/client-sdk-auth

This SDK provides a set of tools for authenticating users in a Crossmint-powered application on the client-side. It simplifies the process of handling authentication tokens, managing user sessions, and integrating various authentication methods into your web applications.

## Installation

To install the SDK, you can use npm or yarn:

```bash
npm install @crossmint/client-sdk-auth
```

## Usage

To use the SDK in your application, follow these steps:

1. Import the SDK into your project:

```typescript
import { createCrossmint, CrossmintAuth } from "@crossmint/client-sdk-auth";

const crossmint = createCrossmint({
    apiKey: process.env.CLIENT_CROSSMINT_API_KEY || "",
});

const crossmintAuth = CrossmintAuth.from(crossmint);
```

2. Use the SDK to authenticate users and manage sessions:

```typescript
// Get the current user
const user = await crossmintAuth.getUser();

// Log out the user and clear cookies
crossmintAuth.logout();
```

## Custom Storage Providers

By default, the SDK uses browser cookies for storing authentication materials. For environments where cookies are not available, such as React Native, you can provide a custom storage provider.

### React Native Storage Options

The SDK provides several secure storage implementations for React Native:

#### 1. Expo SecureStore (Recommended for Expo apps)

**First install dependencies:**

```bash
npx expo install expo-secure-store
```

For Expo applications, use SecureStore which provides a secure encrypted storage solution:

```typescript
import * as SecureStore from 'expo-secure-store';
import { ExpoSecureStorage, CrossmintAuth } from "@crossmint/client-sdk-auth";

// Create a custom storage provider using Expo's SecureStore
const storageProvider = new ExpoSecureStorage(SecureStore);

// Initialize auth client with secure storage
const crossmintAuth = CrossmintAuth.from(crossmint, {
  storageProvider
});
```

#### 2. React Native Encrypted Storage (Recommended for non-Expo apps)

**First install dependencies:**

```bash
npm install react-native-encrypted-storage
```

For vanilla React Native apps, use EncryptedStorage:

```typescript
import EncryptedStorage from 'react-native-encrypted-storage';
import { RNEncryptedStorage, CrossmintAuth } from "@crossmint/client-sdk-auth";

// Create a custom storage provider using react-native-encrypted-storage
const storageProvider = new RNEncryptedStorage(EncryptedStorage);

// Initialize auth client with secure storage
const crossmintAuth = CrossmintAuth.from(crossmint, {
  storageProvider
});
```

### Implementing Custom Storage

You can implement any storage solution by implementing the `StorageProvider` interface:

```typescript
export interface StorageProvider {
  get(key: string): string | undefined | Promise<string | undefined>;
  set(key: string, value: string, expiresAt?: string): void | Promise<void>;
  remove(key: string): void | Promise<void>;
}
```

## Secure setup using HttpOnly cookies

To secure the authentication material, you can set up a custom endpoint in your backend that will handle refreshing the authentication material and storing it in HttpOnly cookies. This way, the authentication material is not accessible to JavaScript running in the browser.

### Configure custom refresh route

In the client, provide the custom refresh route when creating the CrossmintAuth instance:

```typescript
const crossmintAuth = CrossmintAuth.from(crossmint, {
    refreshRoute: "/api/refresh",
});
```

This way, the SDK will use the provided route to refresh the token instead of the default one and the authentication material can be stored in HttpOnly cookies that are tied to the domain of the provided route.

### Configure custom logout route

As you're now using HttpOnly cookies, logout can't happen client-side as it doesn't have access to the cookies. You can set up a custom logout route to handle the logout process.

In the client, provide the custom logout route when creating the CrossmintAuth instance:

```typescript
const crossmintAuth = CrossmintAuth.from(crossmint, {
    logoutRoute: "/api/logout",
});
```

NOTE: Depending on the framework you're using, you might need to set the whole URL in the `refreshRoute` and `logoutRoute` options.

## Advanced Usage

You can provide callbacks for token refresh and logout events when creating the CrossmintAuthClient:

```typescript
const crossmintAuth = CrossmintAuth.from(crossmint, {
    callbacks: {
        onTokenRefresh: (authMaterial) => {
            // Handle new authentication material
        },
        onLogout: () => {
            // Handle logout
        },
    },
});
```

### Authentication Material

```json
{
    "jwt": "...",
    "refreshToken": "...",
    "user": {
        "id": "...",
        "email": "..."
    }
}
```

These callbacks allow you to perform custom actions when tokens are refreshed or when the user logs out.
