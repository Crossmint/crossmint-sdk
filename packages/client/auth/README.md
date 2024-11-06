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

## Advanced Usage

You can provide callbacks for token refresh and logout events when creating the CrossmintAuthClient:

```typescript
const crossmintAuth = CrossmintAuthClient.from(crossmint, {
    onTokenRefresh: (authMaterial) => {
        // Handle new authentication material
    },
    onLogout: () => {
        // Handle logout
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