export const embeddedCheckoutIFrameId = "crossmint-embedded-checkout.iframe";

export const updatableCommonParams = ["recipient", "mintConfig", "locale", "curreny", "whPassThroughArgs"] as const;
export const updatableFiatParams = [...updatableCommonParams] as const;
export const updatableCryptoParams = ["signer", ...updatableCommonParams] as const;
