export interface PublicKeyCacheProvider {
    getCachedPublicKey: () => string | null;
    setCachedPublicKey: (publicKey: string) => void;
}

const CROSSMINT_PUBLIC_KEY_CACHE_KEY = "CROSSMINT_PUBLIC_KEY";

//TODO: Implement a class that expects a Redis client as a dependency
class InMemoryPublicKeyCacheProvider implements PublicKeyCacheProvider {
    private cache: Map<string, { value: string }> = new Map();

    public getCachedPublicKey() {
        const publicKey = this.cache.get(CROSSMINT_PUBLIC_KEY_CACHE_KEY);
        return publicKey ? publicKey.value : null;
    }

    public setCachedPublicKey(publicKey: string) {
        this.cache.set(CROSSMINT_PUBLIC_KEY_CACHE_KEY, { value: publicKey });
    }
}

const publicKeyCacheProvider = new InMemoryPublicKeyCacheProvider();

export default publicKeyCacheProvider;
