import { AppProps } from 'next/app';
import { FC, ReactNode } from 'react';
import { CrossMintModalProvider, CrossMintPopupProvider } from '../../../ui/react-ui/lib';

// Use require instead of import, and order matters
require('../styles/globals.css');
require('@crossmint/mint-adapter-react-ui/styles.css');

const App: FC<AppProps> = ({ Component, pageProps }) => {
    return (
        <CrossMintModalProvider>
            <CrossMintPopupProvider>
                <Component {...pageProps} />
            </CrossMintPopupProvider>
        </CrossMintModalProvider>
    );
};

export default App;
