# Crossmint React Native Plugins

## Google Pay Plugin

The Google Pay plugin configures your React Native app to support Google Pay payments.

### Usage

1. Install the Crossmint React Native SDK:

```bash
npm install @crossmint/client-sdk-react-native-ui
```

2. Add the plugin to your `app.json` or `app.config.js`:

```json
{
  "expo": {
    "plugins": [
      [
        "@crossmint/client-sdk-react-native-ui/plugins/withGooglePay",
        {
          "enableGooglePay": true
        }
      ]
    ]
  }
}
```

Or in `app.config.js`:

```javascript
export default {
  expo: {
    plugins: [
      [
        "@crossmint/client-sdk-react-native-ui/plugins/withGooglePay",
        {
          enableGooglePay: true
        }
      ]
    ]
  }
};
```

2. Add WebKit dependency to your app's build.gradle:

```gradle
// android/app/build.gradle
dependencies {
    implementation("androidx.webkit:webkit:1.14.0")
}
```

### What it does

When `enableGooglePay` is true, the plugin:

1. Adds Google Pay wallet API meta-data to AndroidManifest.xml:
   ```xml
   <meta-data android:name="com.google.android.gms.wallet.api.enabled" android:value="true"/>
   ```

2. Adds Google Pay intent queries to AndroidManifest.xml:
   ```xml
   <queries>
     <intent>
       <action android:name="org.chromium.intent.action.PAY"/>
     </intent>
     <intent>
       <action android:name="org.chromium.intent.action.IS_READY_TO_PAY"/>
     </intent>
     <intent>
       <action android:name="org.chromium.intent.action.UPDATE_PAYMENT_DETAILS"/>
     </intent>
   </queries>
   ```

3. Requires manual addition of WebKit dependency for payment processing.

### Configuration Options

- `enableGooglePay` (boolean, optional): When set to `true`, enables Google Pay configuration. Defaults to `false`.

### Requirements

- Expo SDK 52.0.0 or higher
- React Native 0.74.3 or higher
- Android API level 21 or higher for Google Pay support

### Notes

The WebKit dependency must be added manually to your app's build.gradle file as React Native/Expo config plugins cannot automatically modify gradle dependencies. This dependency is required for proper payment processing within WebView components.

### Plugin Path

When referencing this plugin in your app configuration, use the path:
`@crossmint/client-sdk-react-native-ui/plugins/withGooglePay`
