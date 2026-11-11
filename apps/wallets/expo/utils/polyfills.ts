// see https://docs.solanamobile.com/react-native/polyfill-guides/web3-js
import { Buffer } from "buffer/";

(globalThis as { Buffer?: unknown }).Buffer = Buffer;

import "react-native-get-random-values";
