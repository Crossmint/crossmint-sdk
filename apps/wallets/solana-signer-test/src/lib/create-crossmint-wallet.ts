import { CrossmintWallets, createCrossmint } from "@crossmint/wallets-sdk";
import type { VersionedTransaction } from "@solana/web3.js";

export async function createCrossmintSmartWallet(iframeSigner: {
    type: "solana-keypair";
    address: string;
    signer: {
        signMessage: (message: Uint8Array) => Promise<Uint8Array>;
        signTransaction: (
            transaction: VersionedTransaction
        ) => Promise<VersionedTransaction>;
    };
}) {
    const crossmint = createCrossmint({
        apiKey:
            process.env.NEXT_PUBLIC_CROSSMINT_API_KEY ||
            (() => {
                throw new Error("NEXT_PUBLIC_CROSSMINT_API_KEY is not set");
            })(),
    });
    const crossmintWallets = CrossmintWallets.from(crossmint);
    const wallet = await crossmintWallets.getOrCreateWallet(
        "solana-smart-wallet",
        {
            adminSigner: iframeSigner,
        }
    );

    return wallet;
}
