import CrossmintProviders from "@/providers/CrossmintProviders";
import Login from "@/components/Login";
import { getAuthSession } from "@/hooks/auth";

export default async function DirectPage() {
    // Direct API approach (no refresh route)
    const session = await getAuthSession();
    const userId = session?.userId;

    return (
        <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
            <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start">
                <h1 className="text-2xl font-bold">Welcome to Crossmint Auth Nextjs Demo (Direct API Approach)</h1>
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
