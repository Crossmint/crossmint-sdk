This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3001](http://localhost:3001) with your browser to see the result.

You can start editing the page by modifying `pages/index.tsx`. The page auto-updates as you edit the file.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.

## Run Playwright tests

-   `npx playwright install` in the `/crossmint-sdk/packages/client/wallets/aa` directory
-   Add `.env.local` file in `/crossmint-sdk/packages/client/wallets/aa/front` with `NEXT_PUBLIC_API_KEY_STG` and `NEXT_PUBLIC_API_KEY_DEV`
-   `yarn dev` to raise the test app on port 3001 `/crossmint-sdk/packages/client/wallets/aa/front`
-   In `/crossmint-sdk/packages/client/wallets/aa` run `npx playwright test --project=chromium packages/client/wallets/aa/playwright/tests --ui`. If yoi dont want to open the playwright ui, just omit `--ui`
