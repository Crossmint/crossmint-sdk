import { NextResponse } from "next/server";
import { Keypair, type VersionedTransaction } from "@solana/web3.js";
import { createCrossmint, CrossmintWallets } from "@crossmint/wallets-sdk";

export async function POST() {
    try {
        const serverKey = process.env.CROSSMINT_SERVER_API_KEY;
        const adminPrivateKey = process.env.X402_ADMIN_PRIVATE_KEY;
        const adminEmail = process.env.X402_ADMIN_EMAIL;

        if (!serverKey || !adminPrivateKey || !adminEmail) {
            return NextResponse.json(
                { error: "Missing CROSSMINT_SERVER_API_KEY or X402_ADMIN_PRIVATE_KEY or X402_ADMIN_EMAIL env vars" },
                { status: 500 }
            );
        }

        const privateKeyBytes = new Uint8Array(Buffer.from(adminPrivateKey, "base64"));
        const keypair = Keypair.fromSecretKey(privateKeyBytes);

        const crossmint = createCrossmint({ apiKey: serverKey });
        const wallets = CrossmintWallets.from(crossmint);

        const signerConfig = {
            type: "external-wallet" as const,
            address: keypair.publicKey.toBase58(),
            onSignTransaction: async (tx: VersionedTransaction) => {
                tx.sign([keypair]);
                return tx;
            },
        };

        let wallet;
        try {
            wallet = await wallets.getWallet(keypair.publicKey.toBase58(), {
                owner: `email:${adminEmail}`,
                chain: "solana",
                signer: signerConfig,
            });
        } catch {
            wallet = await wallets.createWallet({
                owner: `email:${adminEmail}`,
                chain: "solana",
                signer: signerConfig,
            });
        }

        return NextResponse.json({ address: wallet.address });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
