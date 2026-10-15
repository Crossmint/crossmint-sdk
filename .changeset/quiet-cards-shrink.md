---
"@crossmint/client-sdk-react-ui": patch
---

Remove unused dependencies on ethers transactions and react-jss, reducing installed packages and removing an unnecessary legacy ethers dependency tree. Remove the redundant direct auth dependency; authentication remains available through the existing React base dependency.
