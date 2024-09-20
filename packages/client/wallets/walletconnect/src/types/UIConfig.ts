import type { CoreTypes } from "@walletconnect/types";

export type CrossmintWalletConnectUIConfig = {
    colors?: CrossmintWalletConnectUIConfigColors;
    metadata: Omit<CoreTypes.Metadata, "icons"> & { icon: string };
};

export type CrossmintWalletConnectRequiredUIConfig = {
    colors: Required<CrossmintWalletConnectUIConfigColors>;
    metadata: CrossmintWalletConnectUIConfig["metadata"];
};

export type CrossmintWalletConnectUIConfigColors = {
    textPrimary?: string;
    textSecondary?: string;
    textLink?: string;
    textAccentButton?: string;
    accent?: string;
    background?: string;
    backgroundSecondary?: string;
    border?: string;
    danger?: string;
};
