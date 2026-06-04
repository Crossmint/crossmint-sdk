import { type NextRequest, NextResponse } from "next/server";
import { getWalletsClient, getSignerConfig } from "@/lib/server-wallet";

export async function POST(request: NextRequest) {
    try {
        const { walletAddress, recipient, token, amount } = await request.json();

        if (walletAddress == null || recipient == null || token == null || amount == null) {
            return NextResponse.json(
                { error: "walletAddress, recipient, token, and amount are required" },
                { status: 400 }
            );
        }

        const wallets = getWalletsClient();
        const wallet = await wallets.getWallet(walletAddress, { chain: "base-sepolia" });
        // biome-ignore lint/correctness/useHookAtTopLevel: not a React hook
        await wallet.useSigner(getSignerConfig());
        const tx = await wallet.send(recipient, token, amount);

        return NextResponse.json({
            explorerLink: tx.explorerLink,
            hash: tx.hash,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Transfer failed";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
