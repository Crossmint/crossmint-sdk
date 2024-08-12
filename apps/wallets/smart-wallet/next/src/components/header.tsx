"use client";

import { useAuth } from "@/hooks/useAuth";
import { Logo, MobileLogo } from "@/icons/logo";
import { LogoutIcon } from "@/icons/logout";
import { Copy, Image as ImageIcon, User, WalletMinimal } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Avatar, AvatarFallback, AvatarImage } from "./avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "./dropdown-menu";
import { Typography } from "./typography";
import { useToast } from "./use-toast";

const mockWalletId = "0x3948DFG77204ABCD1234EF567890GKL475";

export const Header = () => {
    const { authedUser, signOut } = useAuth();
    const router = useRouter();
    const { toast } = useToast();

    const handleLogout = () => {
        signOut();
        router.push("/");
    };

    return (
        <div className="flex justify-between p-6 items-center">
            <div className="justify-center items-center flex ">
                <div className="hidden sm:block">
                    <Logo />
                </div>
                <div className="block sm:hidden">
                    <MobileLogo />
                </div>
            </div>
            {authedUser ? (
                <div className="flex gap-5 items-center">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <div className="flex items-center bg-skeleton rounded-full px-4 py-2 gap-2 cursor-pointer text-secondary-foreground">
                                <WalletMinimal className="h-4 w-4" />
                                <Typography>
                                    {mockWalletId.substring(0, 6) +
                                        "..." +
                                        mockWalletId.substring(mockWalletId.length - 3, mockWalletId.length)}
                                </Typography>
                            </div>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                            <div className="flex flex-col gap-2">
                                <div
                                    className="flex gap-3 text-muted items-center cursor-pointer py-2"
                                    onClick={async () => {
                                        await navigator.clipboard.writeText(mockWalletId);
                                        toast({ title: "Address copied to clipboard", duration: 5000 });
                                    }}
                                >
                                    <Typography>
                                        {mockWalletId.substring(0, 14) +
                                            "..." +
                                            mockWalletId.substring(mockWalletId.length - 6, mockWalletId.length)}
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

                    <Avatar className="h-9 w-9">
                        <AvatarImage alt="User Avatar" src={authedUser?.photoURL ?? ""} />
                        <AvatarFallback className="bg-skeleton">
                            <User className="h-5 w-5" />
                        </AvatarFallback>
                    </Avatar>
                </div>
            ) : null}
        </div>
    );
};
