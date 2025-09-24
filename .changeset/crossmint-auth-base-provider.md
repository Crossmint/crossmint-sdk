---
"@crossmint/client-sdk-react-base": minor
"@crossmint/client-sdk-react-ui": minor
"@crossmint/client-sdk-react-native": minor
---

feat: create CrossmintAuthBaseProvider and refactor platform packages

- Create CrossmintAuthBaseProvider in react-base with shared auth logic
- Extract common CrossmintAuth initialization, JWT/user state management  
- Refactor react-ui to extend base while keeping web-specific providers
- Refactor react-native to extend base while keeping mobile-specific features
- Maintain all existing functionality and platform differences
- Add useCrossmintAuthBase hook to resolve React context type conflicts
