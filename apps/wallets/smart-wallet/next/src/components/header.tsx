"use client";

import Image from "next/image";
import { Logo, MobileLogo } from "@/icons/logo";
import { LogoutIcon } from "@/icons/logout";
import { Copy, Image as ImageIcon, User } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type EVMSmartWallet, type SolanaSmartWallet, useAuth, useWallet } from "@crossmint/client-sdk-react-ui";

import { Avatar, AvatarFallback, AvatarImage } from "./avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "./dropdown-menu";
import { Typography } from "./typography";
import { useToast } from "./use-toast";
import type { WalletType } from "@/app/context/wallet-config";
import { Button } from "./button";

function formatWalletAddress(address: string, startLength: number, endLength: number): string {
    return `${address.substring(0, startLength)}...${address.substring(address.length - endLength)}`;
}

export const Header: React.FC = () => {
    const { logout, status: authStatus } = useAuth();
    const { wallet, status: walletStatus, type } = useWallet();
    const router = useRouter();
    const { toast } = useToast();

    const handleLogout = () => {
        logout();
        router.push("/");
    };

    const handleCopyAddress = async () => {
        if (wallet != null) {
            await navigator.clipboard.writeText(wallet.address);
            toast({ title: "Address copied to clipboard", duration: 5000 });
        }
    };

    return (
        <div className="flex justify-between p-4 items-center">
            <HeaderLogo />
            {(walletStatus === "loaded" || walletStatus === "in-progress" || authStatus === "initializing") &&
                wallet != null && (
                    <UserMenu
                        walletType={type}
                        wallet={wallet}
                        walletStatus={walletStatus}
                        onLogout={handleLogout}
                        onCopyAddress={handleCopyAddress}
                    />
                )}
            {walletStatus === "loading-error" ? (
                <Button
                    onClick={() => {
                        logout();
                        router.push("/");
                    }}
                >
                    Sign out and start over?
                </Button>
            ) : null}
        </div>
    );
};

const HeaderLogo: React.FC = () => (
    <Link href="/" className="justify-center items-center flex">
        <div className="hidden sm:block">
            <Logo />
        </div>
        <div className="block sm:hidden">
            <MobileLogo />
        </div>
    </Link>
);

const UserMenu: React.FC<{
    walletType: WalletType;
    wallet: EVMSmartWallet | SolanaSmartWallet;
    walletStatus: string;
    onLogout: () => void;
    onCopyAddress: () => void;
}> = ({ walletType, wallet, walletStatus, onLogout, onCopyAddress }) => (
    <DropdownMenu>
        <DropdownMenuTrigger asChild disabled={walletStatus !== "loaded"}>
            <div className="flex items-center gap-5 cursor-pointer">
                <div className="flex items-center min-w-[150px] bg-skeleton rounded-full px-4 py-2 gap-2 text-secondary-foreground">
                    {getWalletIcon(walletType)}
                    <Typography>
                        {walletStatus !== "loaded" ? "Loading..." : formatWalletAddress(wallet.address, 6, 3)}
                    </Typography>
                </div>
                <Avatar className="h-9 w-9">
                    <AvatarImage alt="User Avatar" src="" />
                    <AvatarFallback className="bg-skeleton">
                        <User className="h-5 w-5" />
                    </AvatarFallback>
                </Avatar>
            </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 overflow-y-auto max-h-[80vh]">
            <div className="flex flex-col gap-2">
                <div className="flex gap-3 text-muted items-center cursor-pointer py-2" onClick={onCopyAddress}>
                    <Typography>{wallet ? formatWalletAddress(wallet.address, 14, 6) : ""}</Typography>
                    <Copy className="h-5 w-5" />
                </div>
                <Link href="/wallet" prefetch={false} className="text-secondary-foreground flex gap-3 py-2">
                    <ImageIcon className="h-5 w-5" />
                    <Typography>Assets</Typography>
                </Link>
                <div className="text-secondary-foreground flex gap-3 py-2 cursor-pointer" onClick={onLogout}>
                    <LogoutIcon className="h-5 w-5" />
                    <Typography>Logout</Typography>
                </div>
            </div>
        </DropdownMenuContent>
    </DropdownMenu>
);

const getWalletIcon = (walletType: WalletType) => {
    if (walletType === "evm-smart-wallet") {
        return <Image src="/icons/eth.png" alt="Ethereum logo" width={24} height={24} className="rounded-md" />;
    }
    if (walletType === "solana-smart-wallet") {
        return <Image src="/icons/sol.svg" alt="Solana logo" width={24} height={24} className="rounded-md" />;
    }
    return null;
};
