import { NextResponse } from "next/server";
import { getWalletsClient, getSignerConfig } from "@/lib/server-wallet";

export async function POST() {
    try {
        const wallets = getWalletsClient();
        const signerConfig = getSignerConfig();

        const wallet = await wallets.createWallet({
            chain: "base-sepolia",
            recovery: { type: "server", secret: signerConfig.secret },
            signers: [signerConfig],
        });

        return NextResponse.json({
            address: wallet.address,
            chain: wallet.chain,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to create wallet";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
