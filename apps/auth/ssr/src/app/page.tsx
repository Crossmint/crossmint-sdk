import { createCrossmint, CrossmintAuth } from "@crossmint/server-sdk";

export default function Home() {
    const crossmint = createCrossmint({
        apiKey: process.env.SERVER_CROSSMINT_API_KEY || "",
    });
    const crossmintAuth = CrossmintAuth.from(crossmint);

    console.log(crossmint);
    console.log(crossmintAuth);

    return (
        <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
            <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start">
                Welcome to Crossmint Auth Nextjs Demo
            </main>
        </div>
    );
}
