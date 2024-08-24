"use client";

import { Logo, MobileLogo } from "@/icons/logo";
import { LogoutIcon } from "@/icons/logout";
import { Copy, Image as ImageIcon, User, WalletMinimal } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useAuth, useWallet } from "@crossmint/client-sdk-react-ui";

import { Avatar, AvatarFallback, AvatarImage } from "./avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "./dropdown-menu";
import { Typography } from "./typography";
import { useToast } from "./use-toast";

function formatWalletAddress(address: string, startLength: number, endLength: number) {
    return `${address.substring(0, startLength)}...${address.substring(address.length - endLength)}`;
}

export const Header = () => {
    const { logout } = useAuth();
    const { wallet, status: walletStatus } = useWallet();
    const router = useRouter();
    const { toast } = useToast();

    const handleLogout = () => {
        logout();
        router.push("/");
    };

    return (
        <div className="flex justify-between p-4 items-center">
            <Link href="/" className="justify-center items-center flex">
                <div className="hidden sm:block">
                    <Logo />
                </div>
                <div className="block sm:hidden">
                    <MobileLogo />
                </div>
            </Link>

            {walletStatus === "loaded" || walletStatus === "in-progress" ? (
                <div className="flex gap-5">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild disabled={walletStatus !== "loaded"}>
                            <div className="flex items-center gap-5 cursor-pointer">
                                <div className="flex items-center min-w-[150px] bg-skeleton rounded-full px-4 py-2 gap-2 text-secondary-foreground">
                                    <WalletMinimal className="h-4 w-4" />
                                    <Typography>
                                        {wallet != null ? formatWalletAddress(wallet.address, 6, 3) : "Loading..."}
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
                                <div
                                    className="flex gap-3 text-muted items-center cursor-pointer py-2"
                                    onClick={async () => {
                                        await navigator.clipboard.writeText(wallet?.address ?? "");
                                        toast({ title: "Address copied to clipboard", duration: 5000 });
                                    }}
                                >
                                    {wallet ? (
                                        <Typography>{formatWalletAddress(wallet.address, 14, 6)}</Typography>
                                    ) : null}
                                    <Copy className="h-5 w-5" />
                                </div>
                                <Link
                                    href="/wallet"
                                    prefetch={false}
                                    className="text-secondary-foreground flex gap-3 py-2"
                                >
                                    <ImageIcon className="h-5 w-5" />
                                    <Typography>Assets</Typography>
                                </Link>
                                <div
                                    className="text-secondary-foreground flex gap-3 py-2 cursor-pointer"
                                    onClick={handleLogout}
                                >
                                    <LogoutIcon className="h-5 w-5" />
                                    <Typography>Logout</Typography>
                                </div>
                            </div>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            ) : null}
        </div>
    );
};
