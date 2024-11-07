import { cookies } from "next/headers";
import { createCrossmint, CrossmintAuth } from "@crossmint/server-sdk";
import CrossmintProviders from "@/providers/CrossmintProviders";
import Login from "@/components/Login";

export default async function Home() {
    let userId: string | undefined;

    try {
        const crossmint = createCrossmint({
            apiKey: process.env.SERVER_CROSSMINT_API_KEY || "",
        });
        const crossmintAuth = CrossmintAuth.from(crossmint, {
            refreshRoute: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/refresh`,
        });

        const cookieStore = cookies();
        const jwtCookie = cookieStore.get("crossmint-jwt")?.value;
        const refreshCookie = cookieStore.get("crossmint-refresh-token")?.value;

        if (refreshCookie != null) {
            const { jwt, userId: fetchedUserId } = await crossmintAuth.getSession({
                jwt: jwtCookie,
                refreshToken: refreshCookie,
            });
            userId = fetchedUserId;
            console.log("jwt", jwt);
        } else {
            console.log("user not logged in");
        }
    } catch (error) {
        console.error(error);
    }

    return (
        <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
            <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start">
                <h1 className="text-2xl font-bold">Welcome to Crossmint Auth Nextjs Demo</h1>
                {userId ? (
                    <div>
                        <p>You are logged in!</p>
                        {userId && <p>Your user ID is: {userId}</p>}
                    </div>
                ) : null}

                <CrossmintProviders>
                    <Login />
                </CrossmintProviders>
            </main>
        </div>
    );
}
