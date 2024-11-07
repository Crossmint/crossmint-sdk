# @crossmint/server-sdk

This SDK provides a set of tools for authenticating users in a Crossmint-powered application using server-side rendering (SSR). It simplifies the process of handling authentication tokens and managing user sessions, making it easier to integrate authentication into your Next.js applications.

## Installation

To install the SDK, you can use npm or yarn:

```bash
npm install @crossmint/server-sdk
```

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

With most frameworks, pass the request object:

```ts
const { jwt, userId } = await crossmintAuth.getSession(request);
```

With Next.js, fetch the cookies and pass them to the `getSession` method:

```ts
import { cookies } from "next/headers";

const cookieStore = cookies();
const jwtCookie = cookieStore.get("crossmint-session")?.value;
const refreshCookie = cookieStore.get("crossmint-refresh-token")?.value;

const { jwt, userId } = await crossmintAuth.getSession({
    jwt: jwtCookie,
    refreshToken: refreshCookie,
});
```

3. Store the authentication material in cookies

If you are using a framework with access to the response object, you can store the authentication material in cookies by passing the response object to the `getSession` method:

```ts
const { jwt, userId } = await crossmintAuth.getSession(request, response);
```

4. Logout

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
const crossmintAuth = CrossmintAuthClient.from(crossmint, {
    refreshRoute: "/api/refresh",
});
```

This way, the SDK will use the provided route to refresh the token instead of the default one and the authentication material can be stored in HttpOnly cookies that are tied to the domain of the provided route.

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