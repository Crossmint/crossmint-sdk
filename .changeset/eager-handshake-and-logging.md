---
'@crossmint/client-sdk-react-native-ui': patch
---

Start handshake eagerly on WebView init instead of waiting for onLoadEnd/frame-ready. On low-end Android devices, onLoadEnd fires 15-23s after the child JS starts, causing the child's 10s handshake timeout to expire before the parent begins polling. By starting immediately, the parent's handshakeRequest is already flowing when the child calls handshakeWithParent(). Also adds comprehensive diagnostic logging (generation counter, duration, platform, trigger source) to all handshake lifecycle events for DataDog visibility.
