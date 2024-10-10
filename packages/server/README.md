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
const { jwtToken, userId } = await crossmintAuth.getSession(request);
```

With Next.js, fetch the cookies and pass them to the `getSession` method:

```ts
import { cookies } from "next/headers";

const cookieStore = cookies();
const jwtCookie = cookieStore.get("crossmint-session")?.value;
const refreshCookie = cookieStore.get("crossmint-refresh-token")?.value;

const { jwtToken, userId } = await crossmintAuth.getSession({
    jwtToken: jwtCookie,
    refreshToken: refreshCookie,
});
```

