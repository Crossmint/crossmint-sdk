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