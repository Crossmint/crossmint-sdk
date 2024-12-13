export type WalletType = "evm-smart-wallet" | "solana-custodial-wallet";

export type SignerType = "evm-keypair" | "passkey" | "eoa";

export type AdminSigner = {
    type: SignerType;
    address: string;
    locator?: string;
};

export type WalletConfig = {
    adminSigner: AdminSigner;
    version?: string;
    chainId?: number;
};

export type Wallet = {
    type: WalletType;
    address: string;
    createdAt: string;
    config: WalletConfig;
    linkedUser?: string;
};

export type CreateWalletParams = {
    type: WalletType;
    config: WalletConfig;
    linkedUser?: string;
};
