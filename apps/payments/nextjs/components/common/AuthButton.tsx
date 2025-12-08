"use client";

import { useAuth } from "@crossmint/client-sdk-react-ui";

export function AuthButton({ style }: { style?: React.CSSProperties }) {
    const { login, logout, user } = useAuth();

    return (
        <>
            {user == null ? (
                <button
                    type="button"
                    onClick={login}
                    className="bg-blue-500 text-white font-bold py-2 px-4 rounded"
                    style={style}
                >
                    Login
                </button>
            ) : (
                <button
                    type="button"
                    onClick={logout}
                    className="bg-black text-white font-bold py-2 px-4 rounded border-2 border-blue-500"
                    style={style}
                >
                    Logout
                </button>
            )}
        </>
    );
}
