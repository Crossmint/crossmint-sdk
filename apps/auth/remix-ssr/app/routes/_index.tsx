import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { createCrossmint, CrossmintAuth } from "@crossmint/server-sdk";

type LoaderData = {
    userId?: string;
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
    let userId: string | undefined;
    const inProgressResponse = new Response();

    try {
        const crossmint = createCrossmint({
            apiKey: process.env.SERVER_CROSSMINT_API_KEY || "",
        });
        const url = new URL(request.url);
        const crossmintAuth = CrossmintAuth.from(crossmint, {
            refreshRoute: `${url.origin}/api/refresh`,
        });

        const { jwt, userId: fetchedUserId } = await crossmintAuth.getSession(request, inProgressResponse);
        userId = fetchedUserId;
        console.log("jwt", jwt);
    } catch (error) {
        console.error(error);
    }

    const response = json<LoaderData>({ userId });
    inProgressResponse.headers.forEach((value, key) => {
        response.headers.append(key, value);
    });

    return response;
};

export default function Index() {
    const { userId } = useLoaderData<LoaderData>();

    return (
        <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
            <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start">
                <h1 className="text-2xl font-bold">Welcome to Crossmint Auth Remix Demo</h1>
                {userId ? (
                    <div>
                        <p>You are logged in!</p>
                        {userId && <p>Your user ID is: {userId}</p>}
                    </div>
                ) : null}
            </main>
        </div>
    );
}
