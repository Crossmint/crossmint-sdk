import { describe, expect, test, vi } from "vitest";
import base58 from "bs58";
import { Keypair, SystemProgram, TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import nacl from "tweetnacl";

import type { ExternalWalletInternalSignerConfig } from "./types";
import type { SolanaChain } from "@/chains/chains";
import { VERSION_1_MESSAGE, VERSION_1_PREFIX } from "./solana-version-1.fixture";
import { SolanaExternalWalletSigner } from "./solana-external-wallet";

const WALLET_KEYPAIR = Keypair.generate();

function makeSigner(callbacks: {
    onSign?: (transaction: VersionedTransaction) => Promise<VersionedTransaction>;
    onSignBytes?: (payload: string) => Promise<string>;
}) {
    return new SolanaExternalWalletSigner({
        type: "external-wallet",
        address: WALLET_KEYPAIR.publicKey.toBase58(),
        locator: `external-wallet:${WALLET_KEYPAIR.publicKey.toBase58()}`,
        ...callbacks,
    } as unknown as ExternalWalletInternalSignerConfig<SolanaChain>);
}

/** A signed version-0 transaction, base58 encoded the way the API supplies it. */
function makeVersion0Transaction() {
    const message = new TransactionMessage({
        payerKey: WALLET_KEYPAIR.publicKey,
        recentBlockhash: Keypair.generate().publicKey.toBase58(),
        instructions: [
            SystemProgram.transfer({
                fromPubkey: WALLET_KEYPAIR.publicKey,
                toPubkey: Keypair.generate().publicKey,
                lamports: 1,
            }),
        ],
    }).compileToV0Message();
    return new VersionedTransaction(message);
}

/** Wrap message bytes in a transaction envelope: one empty signature slot, then the message. */
function envelope(messageBytes: Uint8Array) {
    const bytes = new Uint8Array(1 + 64 + messageBytes.length);
    bytes[0] = 1;
    bytes.set(messageBytes, 65);
    return base58.encode(bytes);
}

describe("SolanaExternalWalletSigner", () => {
    describe("when the transaction is version 1", () => {
        test("signs the message bytes with onSignBytes", async () => {
            const messageBytes = base58.decode(VERSION_1_MESSAGE);
            expect(messageBytes[0]).toBe(VERSION_1_PREFIX);

            const onSign = vi.fn();
            const onSignBytes = vi.fn(async () => "version-1-signature");
            const signer = makeSigner({ onSign, onSignBytes });

            const result = await signer.signTransaction(envelope(messageBytes));

            expect(result).toEqual({ signature: "version-1-signature" });
            expect(onSignBytes).toHaveBeenCalledWith(VERSION_1_MESSAGE);
            expect(onSign).not.toHaveBeenCalled();
        });

        test("names onSignBytes in the error when only onSign is configured", async () => {
            const signer = makeSigner({ onSign: vi.fn() });

            await expect(signer.signTransaction(envelope(base58.decode(VERSION_1_MESSAGE)))).rejects.toThrow(
                /onSignBytes/
            );
        });
    });

    describe("when the transaction is version 0", () => {
        test("routes to onSign even though onSignBytes is configured", async () => {
            const transaction = makeVersion0Transaction();
            const onSignBytes = vi.fn(async () => "unused");
            const onSign = vi.fn((received: VersionedTransaction) => {
                received.sign([WALLET_KEYPAIR]);
                return Promise.resolve(received);
            });
            const signer = makeSigner({ onSign, onSignBytes });

            const { signature } = await signer.signTransaction(base58.encode(transaction.serialize()));

            expect(onSignBytes).not.toHaveBeenCalled();
            expect(onSign).toHaveBeenCalledOnce();
            expect(
                nacl.sign.detached.verify(
                    transaction.message.serialize(),
                    base58.decode(signature),
                    WALLET_KEYPAIR.publicKey.toBytes()
                )
            ).toBe(true);
        });

        test("rejects when no onSign callback is configured", async () => {
            const transaction = makeVersion0Transaction();
            const signer = makeSigner({ onSignBytes: vi.fn(async () => "unused") });

            await expect(signer.signTransaction(base58.encode(transaction.serialize()))).rejects.toThrow(
                /No onSign callback provided/
            );
        });
    });
});
