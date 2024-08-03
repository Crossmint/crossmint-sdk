"use client";

import { useAuth } from "@/hooks/useAuth";
import { useWallet } from "@/hooks/useWallet";
import { Logo } from "@/icons/logo";
import { useRouter } from "next/navigation";

import { Avatar, AvatarFallback, AvatarImage } from "./avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "./dropdown-menu";

export const Header = () => {
    const router = useRouter();

    const { signOut, authedUser } = useAuth();
    const { setSmartWallet } = useWallet();

    const handleLogout = async () => {
        signOut();
        setSmartWallet(null);
        router.push("/");
    };

    return (
        <div className="flex justify-between p-6 items-center">
            <div className="justify-center items-center flex ">
                <Logo />
            </div>
            <div className="flex">
                {/* todo add the wallet button and dropdown here */}
                {authedUser ? (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Avatar>
                                <AvatarImage
                                    alt="User Avatar"
                                    src={authedUser?.photoURL ?? "/sample-avatar.jpg"}
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
                ) : null}
            </div>
        </div>
    );
};
