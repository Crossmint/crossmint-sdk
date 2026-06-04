import { type NextRequest, NextResponse } from "next/server";
import { getWalletsClient, getSignerConfig } from "@/lib/server-wallet";

export async function POST(request: NextRequest) {
    try {
        const { walletAddress, amount } = await request.json();

        if (walletAddress == null || amount == null) {
            return NextResponse.json({ error: "walletAddress and amount are required" }, { status: 400 });
        }

        const wallets = getWalletsClient();
        const wallet = await wallets.getWallet(walletAddress, { chain: "base-sepolia" });
        // biome-ignore lint/correctness/useHookAtTopLevel: not a React hook
        await wallet.useSigner(getSignerConfig());
        await wallet.stagingFund(Number(amount));

        return NextResponse.json({ success: true });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to fund wallet";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
