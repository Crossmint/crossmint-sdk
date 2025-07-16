import { Platform } from "react-native";
import * as Device from "expo-device";

export const osVersion = Device.osVersion || "0";
export const modelName = Device.modelName || "Unknown";

export const userAgent =
  Platform.OS === "ios"
    ? `Mozilla/5.0 (iPhone; CPU iPhone OS ${osVersion
        .toString()
        .replace(
          /\./g,
          "_"
        )} like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/${Math.floor(
        Number(osVersion) / 2
      )}.0 Mobile/15E148 Safari/604.1`
    : `Mozilla/5.0 (Linux; Android ${osVersion}; ${modelName}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.181 Mobile Safari/537.36`;
