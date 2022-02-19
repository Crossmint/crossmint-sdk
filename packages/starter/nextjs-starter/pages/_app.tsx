import { AppProps } from "next/app";

// Use require instead of import, and order matters
require("../styles/globals.css");
require("@crossmint/client-sdk-react-ui/styles.css");

export default function App({ Component, pageProps }: AppProps): JSX.IntrinsicAttributes {
    return (
        <Component {...pageProps} />
    );
}
