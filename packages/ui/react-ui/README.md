# `@crossmint/client-sdk-react-ui`

## Components

### `CrossMintProvider` _required_

CrossMintProvider is a react context that is used to provide your app with our popup, and modal overlay functionality.

| propName  | default     | required | description                                                                     |
| --------- | ----------- | -------- | ------------------------------------------------------------------------------- |
| clientId  | `undefined` | `true`   | Your client integration identifier                                              |
| className | `undefined` | `false`  | Use this to add a custom classname/s to the modal overlay                       |
| container | `body`      | `false`  | Use this to specify the container in which the modal overlay should be rendered |

### `CrossMintButton` _required_

CrossMintButton is a button component that is used to trigger the opening of the CrossMint popup and modal overlay.

| propName              | default     | required | description                                                                                  |
| --------------------- | ----------- | -------- | -------------------------------------------------------------------------------------------- |
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
