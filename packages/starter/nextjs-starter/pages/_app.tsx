import { AppProps } from "next/app";

require("../styles/globals.css");

export default function App({ Component, pageProps }: AppProps): JSX.IntrinsicAttributes {
    return (
        <Component {...pageProps} />
    );
}
