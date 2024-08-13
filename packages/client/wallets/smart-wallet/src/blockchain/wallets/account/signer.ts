import type { EOASignerData, PasskeyDisplay, PasskeySignerData, SignerData, SignerDisplay } from "../../../types/API";

export interface SignerConfig {
    readonly type: "passkeys" | "eoa";
    display(): SignerDisplay;
    readonly data: SignerData;
}

export class PasskeySignerConfig implements SignerConfig {
    public readonly data: PasskeySignerData;
    public readonly type = "passkeys";

    constructor(data: PasskeySignerData) {
        this.data = data;
    }

    public display(): PasskeyDisplay {
        return {
            pubKeyX: this.data.pubKeyX,
            pubKeyY: this.data.pubKeyY,
            passkeyName: this.data.passkeyName,
            type: this.type,
        };
    }
}

export class EOASignerConfig implements SignerConfig {
    public readonly data: EOASignerData;
    public readonly type = "eoa";

    constructor(data: EOASignerData) {
        this.data = data;
    }

    public display() {
        return this.data;
    }
}
