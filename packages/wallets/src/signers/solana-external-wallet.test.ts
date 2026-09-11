import { describe, expect, test, vi } from "vitest";
import base58 from "bs58";
import { Keypair, SystemProgram, TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import nacl from "tweetnacl";

import type { ExternalWalletInternalSignerConfig } from "./types";
import type { SolanaChain } from "@/chains/chains";
import { SolanaExternalWalletSigner } from "./solana-external-wallet";

const WALLET_KEYPAIR = Keypair.generate();
const PAYLOAD = base58.encode(new Uint8Array([1, 2, 3, 4]));

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

describe("SolanaExternalWalletSigner", () => {
    describe("signMessage", () => {
        test("passes any payload to onSignBytes untouched", async () => {
            const onSignBytes = vi.fn(async () => "a-signature");

            const result = await makeSigner({ onSignBytes }).signMessage(PAYLOAD);

            expect(result).toEqual({ signature: "a-signature" });
            expect(onSignBytes).toHaveBeenCalledWith(PAYLOAD);
        });

        test("names onSignBytes in the error when it is not configured", async () => {
            const signer = makeSigner({ onSign: vi.fn() });

            await expect(signer.signMessage(PAYLOAD)).rejects.toThrow(/onSignBytes/);
        });
    });

    describe("signTransaction", () => {
        test("returns the signature the adapter added for this wallet", async () => {
            const transaction = makeVersion0Transaction();
            const onSign = vi.fn((received: VersionedTransaction) => {
                received.sign([WALLET_KEYPAIR]);
                return Promise.resolve(received);
            });

            const { signature } = await makeSigner({ onSign }).signTransaction(base58.encode(transaction.serialize()));

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
            const signer = makeSigner({ onSignBytes: vi.fn(async () => "unused") });

            await expect(signer.signTransaction(base58.encode(makeVersion0Transaction().serialize()))).rejects.toThrow(
                /No onSign callback provided/
            );
        });
    });
});
