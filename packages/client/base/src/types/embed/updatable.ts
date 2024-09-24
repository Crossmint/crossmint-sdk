import type { updatableCryptoParams, updatableFiatParams } from "@/consts";

import type { CryptoEmbeddedCheckoutPropsJSONParsed } from "./json/crypto";
import type { FiatEmbeddedCheckoutPropsJSONParsed } from "./json/fiat";

export type UpdatableFiatParams = Pick<FiatEmbeddedCheckoutPropsJSONParsed, (typeof updatableFiatParams)[number]>;
export type UpdatableCryptoParams = Pick<CryptoEmbeddedCheckoutPropsJSONParsed, (typeof updatableCryptoParams)[number]>;

export type UpdatableEmbeddedCheckoutParams = UpdatableFiatParams | UpdatableCryptoParams;
