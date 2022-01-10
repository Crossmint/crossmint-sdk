import { AppProps } from "next/app";

import { CrossMintProvider } from "@crossmint/client-sdk-react-ui";

// Use require instead of import, and order matters
require("../styles/globals.css");
require("@crossmint/client-sdk-react-ui/styles.css");

export default function App({ Component, pageProps }: AppProps): JSX.IntrinsicAttributes {
    return (
        <CrossMintProvider clientId="<YOUR_CLIENT_ID>">
            <Component {...pageProps} />
        </CrossMintProvider>
    );
}
