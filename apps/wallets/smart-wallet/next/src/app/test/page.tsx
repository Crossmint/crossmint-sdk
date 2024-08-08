"use client";

import { AuthProvider, useAuth } from "@crossmint/client-sdk-auth-core";

function Test() {
    const { login } = useAuth();
    return <button onClick={login}>Hi can you see me?</button>;
}

export default function Index() {
    return (
        <AuthProvider apiKey={process.env.NEXT_PUBLIC_CROSSMINT_API_KEY!} environment="staging">
            <div>
                <Test />
            </div>
        </AuthProvider>
    );
}
