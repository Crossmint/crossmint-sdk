"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import { useAppContext } from "./providers";

export const HandleUnauthedRedirect = () => {
    const { authedUser } = useAppContext();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (!authedUser) {
            router.push("/");
        }

        if (pathname === "/" && authedUser) {
            router.push("/mint");
        }
    }, [pathname, authedUser, router]);

    return null;
};
