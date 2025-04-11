import { CrossmintAuth, OAuthProvider } from "@crossmint/common-sdk-auth";
import * as WebBrowser from "expo-web-browser";
import { useCallback, useEffect, useState } from "react";
import * as Linking from "expo-linking";

export function useOAuthLogin(crossmintAuth?: CrossmintAuth) {
    const [oauthUrlMap, setOauthUrlMap] = useState<Record<OAuthProvider, string>>({
        google: "",
        twitter: "",
    });
    const [isLoadingOauthUrlMap, setIsLoadingOauthUrlMap] = useState(true);

    // Configure deep link handling
    useEffect(() => {
        // Initialize browser to handle auth sessions
        WebBrowser.maybeCompleteAuthSession();

        // Setup subscription to handle incoming links
        const subscription = Linking.addEventListener("url", handleRedirect);

        return () => {
            subscription.remove();
        };
    }, []);

    // Handle redirect with one-time secret
    const handleRedirect = useCallback(
        async (event: { url: string }) => {
            if (!crossmintAuth || !event.url) return;

            try {
                const url = new URL(event.url);
                const oneTimeSecret = url.searchParams.get("oneTimeSecret");

                if (oneTimeSecret) {
                    console.log("[CrossmintAuthProvider] Received oneTimeSecret from redirect");
                    // @ts-ignore - handleRefreshAuthMaterial exists on CrossmintAuthClient but not on the base CrossmintAuth class
                    await crossmintAuth.handleRefreshAuthMaterial(oneTimeSecret);
                    console.log("[CrossmintAuthProvider] Auth material refreshed successfully");
                }
            } catch (error) {
                console.error("[CrossmintAuthProvider] Error handling redirect:", error);
            }
        },
        [crossmintAuth]
    );

    // Prefetch and set OAuth URLs
    const prefetchOAuthUrls = useCallback(async () => {
        if (!crossmintAuth) return;

        setIsLoadingOauthUrlMap(true);
        try {
            const providers = Object.keys(oauthUrlMap) as OAuthProvider[];
            const redirectUrl = Linking.createURL("");

            const urlPromises = providers.map(async (provider) => {
                try {
                    // @ts-ignore - getOAuthUrl exists on CrossmintAuthClient but not on the base CrossmintAuth class
                    const url = await crossmintAuth.getOAuthUrl(provider, { appSchema: redirectUrl });
                    return { [provider]: url };
                } catch (error) {
                    console.error(`[CrossmintAuthProvider] Error fetching OAuth URL for ${provider}:`, error);
                    return { [provider]: "" };
                }
            });

            const results = await Promise.all(urlPromises);
            const newUrlMap = Object.assign({}, ...results) as Record<OAuthProvider, string>;
            setOauthUrlMap(newUrlMap);
        } catch (error) {
            console.error("[CrossmintAuthProvider] Error prefetching OAuth URLs:", error);
        } finally {
            setIsLoadingOauthUrlMap(false);
        }
    }, [crossmintAuth]);

    // Initialize OAuth URLs when the hook mounts
    useEffect(() => {
        prefetchOAuthUrls();
    }, [prefetchOAuthUrls]);

    // Login with OAuth function - simply opens the pre-fetched URL and lets the redirect cycle happen
    const loginWithOAuth = useCallback(
        async (provider: OAuthProvider): Promise<void> => {
            if (!crossmintAuth || !oauthUrlMap[provider]) {
                console.error(
                    `[CrossmintAuthProvider] Cannot login with ${provider}: CrossmintAuth or OAuth URL not available`
                );
                return;
            }

            try {
                console.log(`[CrossmintAuthProvider] Opening OAuth URL for ${provider}`);
                await WebBrowser.openAuthSessionAsync(oauthUrlMap[provider], Linking.createURL(""));
            } catch (error) {
                console.error("[CrossmintAuthProvider] Error during OAuth login:", error);
                throw error;
            }
        },
        [crossmintAuth, oauthUrlMap]
    );

    return {
        oauthUrlMap,
        isLoadingOauthUrlMap,
        loginWithOAuth,
        prefetchOAuthUrls,
    };
}

const extractOneTimeSecretFromUrl = (url: string): string | undefined => {
    const regex = /[?&]oneTimeSecret=([^&#]+)/;
    const match = url.match(regex);
    const secret = match ? decodeURIComponent(match[1]) : undefined;
    return secret;
};
