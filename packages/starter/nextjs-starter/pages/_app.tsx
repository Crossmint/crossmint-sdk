import { AppProps } from "next/app";

import { CrossMintProvider } from "@crossmint/mint-adapter-react-ui";

// Use require instead of import, and order matters
require("../styles/globals.css");
require("@crossmint/mint-adapter-react-ui/styles.css");

export default function App({ Component, pageProps }: AppProps): JSX.IntrinsicAttributes {
    return (
        <CrossMintProvider>
            <Component {...pageProps} />
        </CrossMintProvider>
    );
}
