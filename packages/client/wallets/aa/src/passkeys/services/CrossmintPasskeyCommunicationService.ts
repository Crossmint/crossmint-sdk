import { CrossmintWalletService } from "@/api";
import { logInfo } from "@/services/logging";
import { v4 as uuidV4 } from "uuid";

import { BlockchainIncludingTestnet, UserIdentifierParams } from "@crossmint/common-sdk-base";

type PasskeysMessageBase = {
    type: "passkeysAction";
};

type OpenWindowPasskeysMessage = PasskeysMessageBase & {
    data: "ready";
};

type EncryptionMessage = PasskeysMessageBase & {
    data: string;
};

type DecryptionMessage = PasskeysMessageBase & {
    passphrase: string;
};

type PasskeyHandlerMessage = (event: MessageEvent, resolve: Function, reject: Function) => void;

export type PasskeyParams = {
    walletAddress: string;
    chain: BlockchainIncludingTestnet;
    action: "encrypt" | "decrypt";
    callbackUrl: string;
    passphrase?: string;
};

export type SendPasskeyMessage = {
    passkeysParams: PasskeyParams;
    type: "passkeysAction";
};

export class CrossmintPasskeyCommunicationService {
    private logSlag: string;
    private passkeysCrossmintUrl: string;

    constructor(private crossmintService: CrossmintWalletService) {
        this.logSlag = `[CROSSMINT_PASSKEY_COMMUNICATION_SERVICE - ${uuidV4()}]`;
        this.passkeysCrossmintUrl = getCrossmintPasskeysUrl(crossmintService.crossmintBaseUrl);
        logInfo(`${this.logSlag} - INIT`);
    }

    async getAndDecryptPassphrase(user: UserIdentifierParams, chain: BlockchainIncludingTestnet) {
        const { eoaAddress } = await this.crossmintService.getEOAAddress(user, chain);
        return this.decryptionMessage(eoaAddress, chain);
    }

    async encryptPassphrase(eoaAddress: string, chain: BlockchainIncludingTestnet, passphrase: string) {
        logInfo(`${this.logSlag} [encryptPassphrase] - INIT`, {
            eoaAddress,
            chain,
        });

        const openedWindow = await this.openPasskeysWindowAndWaitForItToBeReady();

        this.postPasskeysMessage(openedWindow, { walletAddress: eoaAddress, chain, action: "encrypt", passphrase });

        return this.handlePasskeyMessage<EncryptionMessage, string>(
            "encryptPassphrase",
            this.handlePasskeyDecryptionMessage.bind(this)
        );
    }

    private async decryptionMessage(eoaAddress: string, chain: BlockchainIncludingTestnet) {
        logInfo(`${this.logSlag} [openPasskeysWindowAndGetPassphrase] - INIT`, {
            eoaAddress,
            chain,
        });

        const openedWindow = await this.openPasskeysWindowAndWaitForItToBeReady();

        this.postPasskeysMessage(openedWindow, { walletAddress: eoaAddress, chain, action: "decrypt" });

        return this.handlePasskeyMessage<DecryptionMessage, string>(
            "decryptionMessage",
            this.handlePasskeyEncryptionMessage.bind(this)
        );
    }

    private handlePasskeyDecryptionMessage(event: MessageEvent<DecryptionMessage>, resolve: Function, _: Function) {
        if (event.data.passphrase == null) return;

        logInfo(`${this.logSlag} [openPasskeysWindowAndGetPassphrase] - EVENT_RECEIVED`, {
            event,
        });

        resolve(event.data.passphrase);
    }

    private async openPasskeysWindowAndWaitForItToBeReady() {
        const openedWindow = window.open(this.passkeysCrossmintUrl, "_blank");

        if (openedWindow == null) {
            throw new Error("Could not open the passkeys window");
        }

        await this.handlePasskeyMessage<OpenWindowPasskeysMessage, string>(
            "waitForItToBeReady",
            this.handlePasskeyReadyMessage.bind(this)
        );

        return openedWindow;
    }

    private handlePasskeyReadyMessage(
        event: MessageEvent<OpenWindowPasskeysMessage>,
        resolve: Function,
        reject: Function
    ) {
        if (event.data.type !== "passkeysAction") return;

        logInfo(`${this.logSlag} [handlePasskeyReadyMessage] - EVENT_RECEIVED`, {
            event,
        });

        if (event.data.data !== "ready") {
            console.error("Received an unexpected message from the passkeys window", event.data);
            return reject("Please contact support.");
        }

        resolve("ok");
    }

    private handlePasskeyEncryptionMessage(event: MessageEvent<EncryptionMessage>, resolve: Function, _: Function) {
        if (event.data.type !== "passkeysAction") return;

        logInfo(`${this.logSlag} [encryptPassphrase] - EVENT_RECEIVED`, {
            event,
        });

        resolve(event.data.data);
    }

    private async handlePasskeyMessage<T extends PasskeysMessageBase, R>(
        functionName: string,
        functionHandlerParam: PasskeyHandlerMessage
    ): Promise<R> {
        logInfo(`${this.logSlag} [${functionName}] - INIT`);

        let messageFunctionHandler: any;

        const response = await new Promise<R>((resolve, reject) => {
            messageFunctionHandler = (event: MessageEvent<T>) => functionHandlerParam(event, resolve, reject);

            window.addEventListener("message", messageFunctionHandler);
        });

        window.removeEventListener("message", messageFunctionHandler);

        logInfo(`${this.logSlag} [${functionName}] - FINISH`);

        return response;
    }

    private postPasskeysMessage(openedWindow: Window, passkeysParams: Omit<PasskeyParams, "callbackUrl">) {
        logInfo(`${this.logSlag} [postPasskeysMessage] - SENDING_MESSAGE`);
        const message = {
            passkeysParams: {
                ...passkeysParams,
                callbackUrl: window.location.href,
            },
            type: "passkeysAction",
        };
        openedWindow.postMessage(message, this.passkeysCrossmintUrl);
    }
}

function getCrossmintPasskeysUrl(crossmintBaseApiUrl: string): string {
    return crossmintBaseApiUrl.replace("api", "passkeys");
}
