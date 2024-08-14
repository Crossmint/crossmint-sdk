"use client";

import { Logo, MobileLogo } from "@/icons/logo";
import { LogoutIcon } from "@/icons/logout";
import { Copy, Image as ImageIcon, User, WalletMinimal } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useAuth } from "@crossmint/client-sdk-react-ui";

import { Avatar, AvatarFallback, AvatarImage } from "./avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "./dropdown-menu";
import { Typography } from "./typography";
import { useToast } from "./use-toast";

export const Header = () => {
    const { jwt, logout, wallet } = useAuth();
    const router = useRouter();
    const { toast } = useToast();

    const isLoadingWallet = !wallet;
    const hasWalletAndJwt = jwt != null && wallet != null && !isLoadingWallet;

    const handleLogout = () => {
        logout();
        router.push("/");
    };

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

            {hasWalletAndJwt || isLoadingWallet ? (
                <div className="flex gap-5">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild disabled={!hasWalletAndJwt}>
                            <div className="flex items-center gap-5 cursor-pointer">
                                <div className="flex items-center min-w-[150px] bg-skeleton rounded-full px-4 py-2 gap-2 text-secondary-foreground">
                                    <WalletMinimal className="h-4 w-4" />
                                    <Typography>
                                        {hasWalletAndJwt
                                            ? wallet.address.substring(0, 6) +
                                              "..." +
                                              wallet.address.substring(wallet.address.length - 3, wallet.address.length)
                                            : "Loading..."}
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
                                    {hasWalletAndJwt ? (
                                        <Typography>
                                            {wallet.address.substring(0, 14) +
                                                "..." +
                                                wallet.address.substring(
                                                    wallet.address.length - 6,
                                                    wallet.address.length
                                                )}
                                        </Typography>
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
