# `@crossmint/mint-adapter`

## Quick Setup (Next.js)

### Install
```bash
yarn add @crossmint/mint-adapter-react-ui
```

### Setup
```javascript
import { AppProps } from 'next/app';
import { FC } from 'react';
import { CrossMintModalProvider, CrossMintPopupProvider } from '@crossmint/mint-adapter-react-ui';

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

```

### Usage

import the Pay with CrossMint button into your app, and enter your Candy Machine ID
```javascript
import { CrossMintButton } from '@crossmint/mint-adapter-react-ui';

export default function Index(){
    return (
        <div
            className="container"
        >
            <CrossMintButton candyMachineId="<YOUR_CANDY_MACHINE_ID>" />
        </div>
    );
}

```
