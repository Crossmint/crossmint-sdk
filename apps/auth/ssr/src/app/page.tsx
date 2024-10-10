import { cookies } from "next/headers";
import { createCrossmint, CrossmintAuth } from "@crossmint/server-sdk";

export default async function Home() {
    let isLoggedIn = false;
    let userId: string | undefined;

    try {
        const crossmint = createCrossmint({
            apiKey: process.env.SERVER_CROSSMINT_API_KEY || "",
        });
        const crossmintAuth = CrossmintAuth.from(crossmint);

        const cookieStore = cookies();
        const jwtCookie = cookieStore.get("crossmint-session")?.value;
        const refreshCookie = cookieStore.get("crossmint-refresh-token")?.value;

        if (refreshCookie != null) {
            const { jwtToken, userId: fetchedUserId } = await crossmintAuth.getSession({
                jwtToken: jwtCookie,
                refreshToken: refreshCookie,
            });
            isLoggedIn = true;
            userId = fetchedUserId;
            console.log("jwt", jwtToken);
            console.log("userId", userId);
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
                {isLoggedIn ? (
                    <div>
                        <p>You are logged in!</p>
                        {userId && <p>Your user ID is: {userId}</p>}
                    </div>
                ) : (
                    <p>Please log in to continue.</p>
                )}
            </main>
        </div>
    );
}
