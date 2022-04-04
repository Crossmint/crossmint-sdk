# `@crossmint/client-sdk-vanilla-ui`

## Quick Setup

### 1. Install

```shell
yarn add @crossmint/client-sdk-vanilla-ui
```

### 2. Import package

You need to choose the way that best fit your project config.

**I am using ESModules in my project**

```javascript
import "@crossmint/client-sdk-vanilla-ui";
```

**I am using CommonJs in my project**

```javascript
require("@crossmint/client-sdk-vanilla-ui");
```

**I am not using any bundler. I need the ready-to-go browser version**

Here you can fetch the script directly from CDN, for example:

```html
<script src="https://unpkg.com/@crossmint/client-sdk-vanilla-ui@0.0.1-alpha.1/lib/index.global.js"></script>
```

### 3. Use package

Now, you can simply place it in your html:

```html
<!-- Place the button somewhere where it's visible even -->
<!-- if the user hasn't connected their wallet -->
<crossmint-pay-button
    collectionTitle="<TITLE_FOR_YOUR_COLLECTION>"
    collectionDescription="<DESCRIPTION_OF_YOUR_COLLECTION>"
    collectionPhoto="<OPT_URL_TO_PHOTO_COVER>"
    clientId="<YOUR_CLIENT_ID>"
/>
```

Finally, make sure you replace the following values in the CrossmintPayButton component:

-   `<TITLE_FOR_YOUR_COLLECTION>`: Example: "My NFT collection"
-   `<DESCRIPTION_OF_YOUR_COLLECTION>`: Example: "The most fun community of 999 generative art monkeys in Solana"
-   `<OPT_URL_TO_PHOTO_COVER>`: Full URL to an image for your collection. Example: "https://i.picsum.photos/id/542/200/300.jpg?hmac=qD8M4ejDPlEc69pGT21BzB7CDiWOcElb_Ke7V8POjm8"
-   `<YOUR_CLIENT_ID>`: This is the clientId you received after filling in [the onboarding form](https://www.crossmint.io/developers/)

## Components

### `CrossmintPayButton` _required_

CrossmintPayButton is a button component that is used to trigger the opening of the Crossmint popup and modal overlay.

**Important note**: Please be mindful of the casing of the props! It's important that the props use camelCase.

```html
<!-- This wont work -->
<crossmint-pay-button client-id="<CLIENT-ID>"></crossmint-pay-button>

<!-- This will work -->
<crossmint-pay-button clientId="<CLIENT-ID>"></crossmint-pay-button>
```

| propName              | default     | required | description                                                                                  |
| --------------------- | ----------- | -------- | -------------------------------------------------------------------------------------------- |
| clientId              | `undefined` | `true`   | Your client integration identifier                                                           |
| collectionTitle       | `undefined` | `false`  | This will be shown to the user during the checkout process. Max length: 120                  |
| collectionDescription | `undefined` | `false`  | This will be shown to the user during the checkout process. Max length: 24                   |
| collectionPhoto       | `undefined` | `false`  | This will be shown to the user during the checkout process. Preferred resolution: 200x200 px |
| className             | `undefined` | `false`  | Use this to add custom classNames to the button                                              |
| disabled              | `undefined` | `false`  | Use this to specify when the button should be disabled                                       |
| onClick               | `undefined` | `false`  | Use this to add a custom onClick handler to the button                                       |
| style                 | `undefined` | `false`  | Use this to add custom CSS styles to the button                                              |
| tabIndex              | `undefined` | `false`  | Use this to add a custom tabIndex to the button                                              |
| theme                 | `dark`      | `false`  | Use this to specify one of our default themes. Can be `light`, `dark`                        |
| ...props              | `undefined` | `false`  | All valid html button props can be added to the button                                       |
