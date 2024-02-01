export class LocalStorageRepository {
    private NCW_DEVICE_ID_KEY_PREFIX = "NCW-deviceId";
    private NCW_WALLET_ID_KEY_PREFIX = "NCW-walletId";
    private NCW_ADDRESS_KEY_PREFIX = "NCW-address";

    constructor(private readonly userIdentifier: string, private readonly projectId: string) {}

    get ncwData() {
        const deviceId = localStorage.getItem(this.key(this.NCW_DEVICE_ID_KEY_PREFIX));
        const walletId = localStorage.getItem(this.key(this.NCW_WALLET_ID_KEY_PREFIX));
        return deviceId && walletId ? { walletId, deviceId } : null;
    }

    set ncwData(data: { walletId: string; deviceId: string } | null) {
        if (data == null) {
            return;
        }

        const { walletId, deviceId } = data;
        localStorage.setItem(this.key(this.NCW_DEVICE_ID_KEY_PREFIX), deviceId);
        localStorage.setItem(this.key(this.NCW_WALLET_ID_KEY_PREFIX), walletId);
    }

    get ncwAddress() {
        return localStorage.getItem(this.key(this.NCW_ADDRESS_KEY_PREFIX));
    }

    set ncwAddress(address: string | null) {
        address
            ? localStorage.setItem(this.key(this.NCW_ADDRESS_KEY_PREFIX), address)
            : localStorage.removeItem(this.key(this.NCW_ADDRESS_KEY_PREFIX));
    }

    private key(prefix: string) {
        return `${prefix}-${this.userIdentifier}-${this.projectId}`;
    }
}
