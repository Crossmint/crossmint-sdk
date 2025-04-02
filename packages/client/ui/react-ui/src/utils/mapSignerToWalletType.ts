export function mapSignerToWalletType(type?: string): "evm-smart-wallet" | "solana-smart-wallet" | undefined {
    if (type == null) {
        return undefined;
    }
    switch (type) {
        case "evm-passkey":
        case "evm-keypair":
            return "evm-smart-wallet";
        case "solana-keypair":
        case "solana-fireblocks-custodial":
            return "solana-smart-wallet";
        default:
            return undefined;
    }
}
