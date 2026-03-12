import { NextResponse } from "next/server";
import { Keypair } from "@solana/web3.js";
import { createCrossmint, CrossmintWallets, SolanaWallet } from "@crossmint/wallets-sdk";

export async function POST(request: Request) {
    try {
        const { walletAddress, paymentUrl, chain } = await request.json();

        const serverKey = process.env.CROSSMINT_SERVER_API_KEY;
        const adminPrivateKey = process.env.X402_ADMIN_PRIVATE_KEY;
        const adminEmail = process.env.X402_ADMIN_EMAIL;

        if (!serverKey || !adminPrivateKey || !adminEmail) {
            return NextResponse.json(
                { error: "Missing CROSSMINT_SERVER_API_KEY or X402_ADMIN_PRIVATE_KEY or X402_ADMIN_EMAIL env vars" }
                { status: 500 }
            );
        }

        const privateKeyBytes = new Uint8Array(Buffer.from(adminPrivateKey, "base64"));
        const keypair = Keypair.fromSecretKey(privateKeyBytes);

        const crossmint = createCrossmint({ apiKey: serverKey });
        const wallets = CrossmintWallets.from(crossmint);

        const wallet = await wallets.getWallet(walletAddress, {
            owner: `email:${adminEmail}`,
            chain,
            signer: {
                type: "external-wallet",
                address: keypair.publicKey.toBase58(),
                onSignTransaction: async (tx) => {
                    tx.sign([keypair]);
                    return tx;
                },
            },
        });

        if (chain === "solana") {
            const solanaWallet = SolanaWallet.from(wallet);
            await solanaWallet.experimental_payX402(paymentUrl);
        } else {
            throw new Error(`X402 payments are not supported for chain ${chain}`);
        }

        return NextResponse.json({ success: true });
    } catch (err: any) {
        const message = err?.message || String(err);
        console.error("x402 pay error:", err);
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
