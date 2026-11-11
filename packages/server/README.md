# @crossmint/server-sdk

This SDK provides a set of tools for authenticating users in a Crossmint-powered application using server-side rendering (SSR). It simplifies the process of handling authentication tokens and managing user sessions, making it easier to integrate authentication into your Next.js applications.

## Installation

To install the SDK, you can use npm or yarn:

```bash
npm install @crossmint/server-sdk
```

## API key and scopes

Use a server-side API key (`sk_...`) from the Crossmint Console. Which scopes it needs depends on the methods you call:

| Method                                           | Scope        |
| ------------------------------------------------ | ------------ |
| `getSession`, `handleCustomRefresh`, `logout`    | None         |
| `getUser`                                        | `users.read` |

`getSession` verifies the JWT with Crossmint's public keys and refreshes the session through endpoints that do not check scopes. `getUser` reads the user's profile, so the key needs `users.read`. Without it, `getUser` throws a `CrossmintAuthenticationError` with `status` 403.

## Usage

To use the SDK in your application, follow these steps:

1. Import the SDK into your project:

```ts
import { createCrossmint, CrossmintAuth } from "@crossmint/server-sdk";

const crossmint = createCrossmint({
    apiKey: process.env.SERVER_CROSSMINT_API_KEY || "",
});

const crossmintAuth = CrossmintAuth.from(crossmint);
```

2. Use the SDK to authenticate users:

Pass the request object, and the SDK reads the session cookies for you. This works with Node.js
(`IncomingMessage`) and Fetch API (`Request`) requests, including Next.js middleware and route handlers:

```ts
const { jwt, userId } = await crossmintAuth.getSession(request);
```

The client SDK stores the session in cookies scoped to your project: `crossmint-jwt-<projectId>` and
`crossmint-refresh-token-<projectId>`, where the project ID comes from your API key. `getSession(request)` reads
those names, and reads the legacy `crossmint-jwt` and `crossmint-refresh-token` names only when no scoped cookie is present.

In a Next.js Server Component there is no request object. Read the cookies by the names `getAuthCookieNames(projectId)`
returns and pass them to `getSession`. The project ID comes from your API key:

```ts
import { cookies } from "next/headers";
import { getAuthCookieNames, validateAPIKey } from "@crossmint/server-sdk";

const apiKeyResult = validateAPIKey(process.env.SERVER_CROSSMINT_API_KEY ?? "");
if (!apiKeyResult.isValid) {
    throw new Error(apiKeyResult.message);
}

const cookieStore = await cookies();
const cookieNames = getAuthCookieNames(apiKeyResult.projectId);
const refreshToken = cookieStore.get(cookieNames.refreshToken)?.value;

if (refreshToken != null) {
    const { jwt, userId } = await crossmintAuth.getSession({
        jwt: cookieStore.get(cookieNames.jwt)?.value,
        refreshToken,
    });
}
```

3. Get the user's profile

`getSession` returns the user's ID. To get their email, phone number or linked X account, pass the ID to `getUser`. It needs the `users.read` scope on your API key:

```ts
import { CrossmintAuthenticationError } from "@crossmint/server-sdk";

try {
    const user = await crossmintAuth.getUser(userId); // { id, email?, phoneNumber?, twitter? }
} catch (error) {
    if (error instanceof CrossmintAuthenticationError) {
        // error.status is 403 when the API key lacks users.read, 404 when the user has not signed in to this project
        console.error(error.status, error.message);
    }
    throw error;
}
```

4. Store the authentication material in cookies

If you are using a framework with access to the response object, you can store the authentication material in cookies by passing the response object to the `getSession` method. The SDK writes the project-scoped cookie names (logout also expires the legacy unscoped ones):

```ts
const { jwt, userId } = await crossmintAuth.getSession(request, response);
```

5. Logout

```ts
await crossmintAuth.logout(request);
```

## Security

The SDK allows you to set the `httpOnly`, `secure`, `domain` and `sameSite` options for the cookies. This way, you can control how the cookies are stored and transmitted. Putting this together with a custom refresh route, you can store the authentication material in HttpOnly cookies that are tied to the domain of the provided route.

Configure CrossmintAuth to do so when creating the custom refresh route:

```ts
const crossmintAuth = CrossmintAuth.from(crossmint, {
    cookieOptions: {
        httpOnly: true,
        sameSite: "Strict",
        secure: true,
        domain: ".example.com",
    },
});
```

`httpOnly` only applies to the refresh token. The session token will not be HttpOnly as it is used in the client for API calls.

## Set up a custom refresh route

To set up a custom refresh route, you can use the `handleCustomRefresh` method. This method will refresh the token and return the new authentication material. This way, the authentication material can be stored in cookies that are tied to the domain of the provided route.

In environments that use the Fetch API for `Request` and `Response` objects, `handleCustomRefresh` will return the response object:

```ts
return await crossmintAuth.handleCustomRefresh(request);
```

In environments that use Node.js API, you also need to provide the response object and end the response:

```ts
await crossmintAuth.handleCustomRefresh(req, res);
res.end();
```

### Using a custom refresh route

You can also provide a custom refresh route:

```typescript
const crossmintAuth = CrossmintAuth.from(crossmint, {
    refreshRoute: `${process.env.APP_URL || "http://localhost:3000"}/api/refresh`,
});
```

The SDK will use the provided route instead of Crossmint's refresh endpoint. On the server, configure this as a static, trusted absolute URL; never derive it from the incoming request or its `Host` header. Use HTTPS in production. The server SDK verifies the refreshed JWT's signature, expiry, and project audience against Crossmint's JWKS, and takes the user ID from its verified `sub` claim.

## Set up a custom logout route

When using `HttpOnly` cookies, logout can't happen client-side as it doesn't have access to the cookies. You can set up a custom logout route to handle the logout process.

In environments that use the Fetch API, `logout` will return the response object:

```ts
return await crossmintAuth.logout(request);
```

In environments that use Node.js API, you also need to provide the response object and end the response:

```ts
await crossmintAuth.logout(req, res);
res.end();
```