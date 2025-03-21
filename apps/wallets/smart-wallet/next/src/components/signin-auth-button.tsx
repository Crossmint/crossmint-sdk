"use client";

import { useAuth } from "@crossmint/client-sdk-react-ui";

import { Button } from "./button";
import { Typography } from "./typography";

export const SignInAuthButton = () => {
    const { login } = useAuth();

    return (
        <div className="flex justify-center">
            <Button className="w-full max-w-[256px] bg-card gap-[10px] shadow-light rounded-xl py-3" onClick={login}>
                <Typography className="text-primary font-semibold text-[17px]">Sign in</Typography>
            </Button>
        </div>
    );
};
