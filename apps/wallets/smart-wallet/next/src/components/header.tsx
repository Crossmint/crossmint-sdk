"use client";

import { Logo, MobileLogo } from "@/icons/logo";
import { LogoutIcon } from "@/icons/logout";
import { Copy, Image as ImageIcon, User, WalletMinimal } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useAuth } from "@crossmint/client-sdk-auth-core";

import { Avatar, AvatarFallback, AvatarImage } from "./avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "./dropdown-menu";
import { Typography } from "./typography";
import { useToast } from "./use-toast";

export const Header = () => {
    const { jwt, logout, wallet, isLoadingWallet } = useAuth();
    const router = useRouter();
    const { toast } = useToast();

    const handleLogout = () => {
        logout();
        router.push("/");
    };

    // if (jwt == null) {
    //     router.push("/");
    // }

    return (
        <div className="flex justify-between p-6 items-center">
            <Link href="/" className="justify-center items-center flex">
                <div className="hidden sm:block">
                    <Logo />
                </div>
                <div className="block sm:hidden">
                    <MobileLogo />
                </div>
            </Link>
            {isLoadingWallet ? (
                <div className="flex items-center gap-5">
                    <div className="flex items-center bg-skeleton rounded-full px-4 py-2 gap-2 text-secondary-foreground">
                        <WalletMinimal className="h-4 w-4 animate-pulse" />
                        <Typography className="animate-pulse">Loading...</Typography>
                    </div>
                    <Avatar className="h-9 w-9">
                        <AvatarImage alt="User Avatar" src={""} />
                        <AvatarFallback>
                            <User className="h-5 w-5" />
                        </AvatarFallback>
                    </Avatar>
                </div>
            ) : jwt != null && wallet != null ? (
                <div className="flex gap-5">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <div className="flex items-center gap-5 cursor-pointer">
                                <div className="flex items-center bg-skeleton rounded-full px-4 py-2 gap-2 text-secondary-foreground">
                                    <WalletMinimal className="h-4 w-4" />
                                    <Typography>
                                        {wallet.address.substring(0, 6) +
                                            "..." +
                                            wallet.address.substring(wallet.address.length - 3, wallet.address.length)}
                                    </Typography>
                                </div>
                                <Avatar className="h-9 w-9">
                                    <AvatarImage alt="User Avatar" src={""} />
                                    <AvatarFallback>
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
                                        await navigator.clipboard.writeText(wallet.address);
                                        toast({ title: "Address copied to clipboard", duration: 5000 });
                                    }}
                                >
                                    <Typography>
                                        {wallet.address.substring(0, 14) +
                                            "..." +
                                            wallet.address.substring(wallet.address.length - 6, wallet.address.length)}
                                    </Typography>
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
