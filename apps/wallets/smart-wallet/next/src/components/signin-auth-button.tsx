"use client";

import { useAuth } from "@crossmint/client-sdk-react-ui";

import { Button } from "./button";
import { Typography } from "./typography";

export const SignInAuthButton = () => {
    const { login } = useAuth();
    return (
        <Button className="bg-card gap-[10px] shadow-light rounded-xl py-3" onClick={login}>
            <Typography className="text-[#00150D] font-semibold text-[17px]">Sign in</Typography>
        </Button>
    );
};
