---
"@crossmint/client-sdk-react-ui": patch
---

`CrossmintIdentityVerification` now grants its iframe `allow="camera"` rather than `allow="microphone; camera"`. Persona's document and selfie capture needs the camera, and no verification template records audio.
