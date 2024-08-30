---
"@crossmint/client-sdk-react-ui": patch
"@crossmint/client-sdk-auth-core": patch
"@crossmint/common-sdk-base": patch
---

Add `appearance` prop to improve UI customization:

-   `@crossmint/common-sdk-base`: Added two fields to `UIConfigColors`: inputBackground and buttonBackground
-   `@crossmint/client-sdk-auth-core`: Implement `appearance` prop functionality
-   `@crossmint/client-sdk-react-ui`: Integrate `appearance` prop for UI components

This change allows for better customization of the UI across all packages that depend on these modules.
