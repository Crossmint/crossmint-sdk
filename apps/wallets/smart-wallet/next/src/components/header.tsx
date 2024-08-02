"use client";

import { useAppContext } from "@/app/_lib/providers";
import { cn } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { Avatar, AvatarFallback, AvatarImage } from "./avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "./dropdown-menu";
import { Typography } from "./typography";

export const Header = () => {
    const router = useRouter();
    const pathname = usePathname();

    const { isAuthenticated, signOutUser } = useAppContext();

    const handleLogout = async () => {
        signOutUser();
        router.push("/");
    };

    return (
        <div className="flex justify-between p-2 items-center">
            <div className="justify-center items-center flex ">
                <Image
                    src={
                        isAuthenticated
                            ? "/assets/icons/crossmint_logo_original.svg"
                            : "/assets/icons/crossmint_logo_white.svg"
                    }
                    width="32"
                    height="32"
                    alt="Crossmint logo"
                    className="[&>path]:stroke-[2] h-[2rem] w-[2rem]"
                />
                <Typography variant={"tag"} className={"font-bold text-primary"}>
                    Crossmint Logo
                </Typography>
            </div>
            {isAuthenticated ? (
                <div className="flex gap-4">
                    <Link href="/mint">
                        <Typography
                            variant={"h4"}
                            className={cn("font-normal", pathname === "/mint" ? "font-semibold" : "")}
                        >
                            Mint
                        </Typography>
                    </Link>
                    <Link href="/wallet">
                        <Typography
                            variant={"h4"}
                            className={cn("font-normal", pathname === "/wallet" ? "font-semibold" : "")}
                        >
                            Wallet
                        </Typography>
                    </Link>
                </div>
            ) : null}
            {isAuthenticated ? (
                <div className="flex">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Avatar>
                                <AvatarImage
                                    alt="User Avatar"
                                    src="/path-to-user-image.jpg"
                                    className="cursor-pointer"
                                />
                                <AvatarFallback className="cursor-pointer">ME</AvatarFallback>
                            </Avatar>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-56">
                            <button
                                onClick={handleLogout}
                                className="block w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-100"
                            >
                                Log out
                            </button>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            ) : null}
        </div>
    );
};
