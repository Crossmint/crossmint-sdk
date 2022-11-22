import { AppProps } from "next/app";
import Head from "next/head";

// Use require instead of import, and order matters
require("../styles/globals.css");

export default function App({ Component, pageProps }: AppProps): JSX.IntrinsicAttributes {
    return (
        <>
            <Head>
                {/* Favicon */}
                <link rel="shortcut icon" href="/crossmint-client-sdk/example/favicon.ico" />

                {/* Primary Meta Tags */}
                <title>Crossmint | The easiest way to purchase and collect NFTs</title>
                <meta name="title" content="Crossmint | The easiest way to purchase and collect NFTs" />
                <meta
                    name="description"
                    content="Crossmint makes it easy to purchase and hold NFTs, by providing NFT creators a credit card checkout plugin for their sites, and providing users a custodial wallet to hold them, that can be accessed via email and password or social authentication."
                />

                {/* Open Graph / Facebook */}
                <meta property="og:type" content="website" />
                <meta property="og:url" content="https://www.crossmint.com/" />
                <meta property="og:title" content="Crossmint | The easiest way to purchase and collect NFTs" />
                <meta
                    property="og:description"
                    content="Crossmint makes it easy to purchase and hold NFTs, by providing NFT creators a credit card checkout plugin for their sites, and providing users a custodial wallet to hold them, that can be accessed via email and password or social authentication."
                />
                <meta property="og:image" content="https://www.crossmint.com/assets/crossmint/metadata.png" />

                {/* Twitter */}
                <meta property="twitter:card" content="summary_large_image" />
                <meta property="twitter:url" content="https://www.crossmint.com/" />
                <meta property="twitter:title" content="Crossmint | The easiest way to purchase and collect NFTs" />
                <meta
                    property="twitter:description"
                    content="Crossmint makes it easy to purchase and hold NFTs, by providing NFT creators a credit card checkout plugin for their sites, and providing users a custodial wallet to hold them, that can be accessed via email and password or social authentication."
                />
                <meta property="twitter:image" content="https://www.crossmint.com/assets/crossmint/metadata.png" />
            </Head>
            <Component {...pageProps} />
        </>
    );
}
