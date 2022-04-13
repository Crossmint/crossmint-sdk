# `@crossmint/client-sdk-react-ui`

## You can check the full documentation at [docs.crossmint.io](https://docs.crossmint.io/)

---

## Quick Setup

### 1. Install

```shell
yarn add @crossmint/client-sdk-react-ui
```

### 2. Set up

Go to the main file where your Candy Machine button lives. For example, Home.tsx.

There, just import the Pay with `CrossmintPayButton`, and add it in the UI.

**Important**: be sure to test that the Crossmint button is visible even if a user didn't connect their wallet! Else, your users without wallets won't be able to use it.

```javascript
import { CrossmintPayButton } from "@crossmint/client-sdk-react-ui";

export default function Index() {
    return (
        ...
        // Place the button somewhere where it's visible even
        // if the user hasn't connected their wallet
        <CrossmintPayButton
            collectionTitle="<TITLE_FOR_YOUR_COLLECTION>"
            collectionDescription="<DESCRIPTION_OF_YOUR_COLLECTION>"
            collectionPhoto="<OPT_URL_TO_PHOTO_COVER>"
            clientId="<YOUR_CLIENT_ID>"
        />
        ...
    );
}
```

Finally, make sure you replace the following values in the CrossmintPayButton component:

-   `<TITLE_FOR_YOUR_COLLECTION>`: Example: "My NFT collection"
-   `<DESCRIPTION_OF_YOUR_COLLECTION>`: Example: "The most fun community of 999 generative art monkeys in Solana"
-   `<OPT_URL_TO_PHOTO_COVER>`: Full URL to an image for your collection. Example: "https://i.picsum.photos/id/542/200/300.jpg?hmac=qD8M4ejDPlEc69pGT21BzB7CDiWOcElb_Ke7V8POjm8"
-   `<YOUR_CLIENT_ID>`: This is the clientId you received after filling in [the onboarding form](https://www.crossmint.io/developers/)

## Components

### `CrossmintPayButton` _required_

CrossmintPayButton is a button component that is used to trigger the opening of the Crossmint popup and modal overlay.

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

### `CrossmintStatusButton`

| propName  | default     | required | description                                                           |
| --------- | ----------- | -------- | --------------------------------------------------------------------- |
| clientId  | `undefined` | `true`   | Your client integration identifier                                    |
| className | `undefined` | `false`  | Use this to add custom classNames to the button                       |
| disabled  | `undefined` | `false`  | Use this to specify when the button should be disabled                |
| onClick   | `undefined` | `false`  | Use this to add a custom onClick handler to the button                |
| style     | `undefined` | `false`  | Use this to add custom CSS styles to the button                       |
| tabIndex  | `undefined` | `false`  | Use this to add a custom tabIndex to the button                       |
| theme     | `dark`      | `false`  | Use this to specify one of our default themes. Can be `light`, `dark` |
| ...props  | `undefined` | `false`  | All valid html button props can be added to the button                |
