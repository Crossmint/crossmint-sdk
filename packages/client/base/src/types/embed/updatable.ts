import { updatableCryptoParams, updatableFiatParams } from "@/consts";

import { CryptoEmbeddedCheckoutPropsJSONParsed } from "./json/crypto";
import { FiatEmbeddedCheckoutPropsJSONParsed } from "./json/fiat";

export type UpdatableFiatParams = Pick<FiatEmbeddedCheckoutPropsJSONParsed, (typeof updatableFiatParams)[number]>;
export type UpdatableCryptoParams = Pick<CryptoEmbeddedCheckoutPropsJSONParsed, (typeof updatableCryptoParams)[number]>;

export type UpdatableEmbeddedCheckoutParams = UpdatableFiatParams | UpdatableCryptoParams;
