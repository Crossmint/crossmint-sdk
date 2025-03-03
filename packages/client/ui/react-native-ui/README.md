# Crossmint React Native UI SDK

React Native UI components for integrating Crossmint functionality into your mobile applications.

## Installation

```bash
npm install @crossmint/client-sdk-react-native-ui
```

or with yarn:

```bash
yarn add @crossmint/client-sdk-react-native-ui
```

or with pnpm:

```bash
pnpm add @crossmint/client-sdk-react-native-ui
```

## Usage

```jsx
import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { WalletButton } from '@crossmint/client-sdk-react-native-ui';

export const WalletConnectExample = () => {
  const [status, setStatus] = useState('disconnected');
  
  const handleConnect = async () => {
    setStatus('connecting');
    
    try {
      // Connect to wallet implementation here
      
      setStatus('connected');
    } catch (error) {
      console.error('Error connecting wallet:', error);
      setStatus('error');
    }
  };
  
  return (
    <View style={styles.container}>
      <WalletButton 
        status={status} 
        onPress={handleConnect}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
```

## Available Components

- `WalletButton` - A button for connecting to a wallet
- More components coming soon!

## Development

### Requirements

- Node.js (>= 20.12.2)
- pnpm (>= 9.0.0)
- Xcode (for iOS development)
- Android Studio (for Android development)

### Setup

1. Clone the repository
2. Install dependencies: `pnpm install`
3. Build the package: `pnpm build`

### Running the Example

The example app uses Expo, which is included as a dev dependency. You don't need to install Expo CLI globally.

```bash
# From the root of the monorepo
pnpm --filter "@crossmint/client-sdk-react-native-ui" example

# Or, navigate to the example directory and run:
cd packages/client/ui/react-native-ui/example
pnpm install
npx expo start
```

Then follow the instructions in the terminal to open the app in:
- iOS Simulator (requires Xcode)
- Android Emulator (requires Android Studio)
- Physical device using Expo Go app (scan QR code)

## License

Apache-2.0 