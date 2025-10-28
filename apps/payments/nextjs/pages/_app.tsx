import type { AppProps } from "next/app";
import type { JSX } from "react";

import "../styles/globals.css";

export default function App({ Component, pageProps }: AppProps): JSX.IntrinsicAttributes {
    return <Component {...pageProps} />;
}
