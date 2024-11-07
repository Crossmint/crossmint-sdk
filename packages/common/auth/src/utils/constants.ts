import { version, name } from "../../package.json";

export const SDK_VERSION = version;
export const SDK_NAME = name;
export const CROSSMINT_API_VERSION = "2024-09-26";
export const AUTH_SDK_ROOT_ENDPOINT = `api/${CROSSMINT_API_VERSION}/session/sdk/auth`;

export const SESSION_PREFIX = "crossmint-jwt";
export const REFRESH_TOKEN_PREFIX = "crossmint-refresh-token";
