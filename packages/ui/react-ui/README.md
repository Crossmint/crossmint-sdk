# `@crossmint/client-sdk-react-ui`

## Components

### `CrossMintButton` _required_

CrossMintButton is a button component that is used to trigger the opening of the CrossMint popup and modal overlay.

| propName                 | default     | required | description                                                                                  |
| ------------------------ | ----------- | -------- | -------------------------------------------------------------------------------------------- |
| clientId                 | `undefined` | `true`   | TBD                                                                                          |
| collectionTitle          | `undefined` | `false`  | This will be shown to the user during the checkout process. Max length: 120                  |
| collectionDescription    | `undefined` | `false`  | This will be shown to the user during the checkout process. Max length: 24                   |
| collectionPhoto          | `undefined` | `false`  | This will be shown to the user during the checkout process. Preferred resolution: 200x200 px |
| className                | `undefined` | `false`  | Use this to add custom classNames to the button                                              |
| disabled                 | `undefined` | `false`  | Use this to specify when the button should be disabled                                       |
| onClick                  | `undefined` | `false`  | Use this to add a custom onClick handler to the button                                       |
| style                    | `undefined` | `false`  | Use this to add custom CSS styles to the button                                              |
| tabIndex                 | `undefined` | `false`  | Use this to add a custom tabIndex to the button                                              |
| theme                    | `dark`      | `false`  | Use this to specify one of our default themes. Can be `light`, `dark`                        |
| mintTo                   | `undefined` | `false`  | TBD                                                                                          |
| emailTo                  | `undefined` | `false`  | TBD                                                                                          |
| listingId                | `undefined` | `false`  | TBD                                                                                          |
| auctionId                | `undefined` | `false`  | TBD                                                                                          |
| hideMintOnInactiveClient | `undefined` | `false`  | TBD                                                                                          |
| development              | `false`     | `false`  | TBD                                                                                          |
| showOverlay              | `true`      | `false`  | TBD                                                                                          |
| ...props                 | `undefined` | `false`  | All valid html button props can be added to the button                                       |

### `CrossMintButtonStatus`

DESCRIPTION TBD

| propName    | default     | required | description                                                           |
| ----------- | ----------- | -------- | --------------------------------------------------------------------- |
| clientId    | `undefined` | `true`   | TBD                                                                   |
| className   | `undefined` | `false`  | Use this to add custom classNames to the button                       |
| disabled    | `undefined` | `false`  | Use this to specify when the button should be disabled                |
| onClick     | `undefined` | `false`  | Use this to add a custom onClick handler to the button                |
| style       | `undefined` | `false`  | Use this to add custom CSS styles to the button                       |
| tabIndex    | `undefined` | `false`  | Use this to add a custom tabIndex to the button                       |
| theme       | `dark`      | `false`  | Use this to specify one of our default themes. Can be `light`, `dark` |
| auctionId   | `undefined` | `false`  | TBD                                                                   |
| development | `false`     | `false`  | TBD                                                                   |
| ...props    | `undefined` | `false`  | All valid html button props can be added to the button                |
