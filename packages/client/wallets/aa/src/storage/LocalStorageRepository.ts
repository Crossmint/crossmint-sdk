export class LocalStorageRepository {
    private NCW_BASE_DEVICE_ID_KEY = "NCW-deviceId-";
    private NCW_BASE_WALLET_ID_KEY = "NCW-walletId-";
    private NCW_BASE_ADDRESS_KEY = "NCW-address-";

    private uniqueHash: string;

    constructor(uniqueHash: string) {
        this.uniqueHash = uniqueHash;
    }

    private get deviceIdKey() {
        return this.NCW_BASE_DEVICE_ID_KEY + this.uniqueHash;
    }

    private get walletIdKey() {
        return this.NCW_BASE_WALLET_ID_KEY + this.uniqueHash;
    }

    private get addressKey() {
        return this.NCW_BASE_ADDRESS_KEY + this.uniqueHash;
    }

    get ncwData() {
        const deviceId = localStorage.getItem(this.deviceIdKey);
        const walletId = localStorage.getItem(this.walletIdKey);
        const address = localStorage.getItem(this.addressKey);
        return deviceId && walletId && address ? { walletId, deviceId } : null;
    }

    set ncwData(data: { walletId: string; deviceId: string } | null) {
        if (!data) {
            localStorage.removeItem(this.deviceIdKey);
            localStorage.removeItem(this.walletIdKey);
            return;
        }
        const { walletId, deviceId } = data;
        localStorage.setItem(this.deviceIdKey, deviceId);
        localStorage.setItem(this.walletIdKey, walletId);
    }

    get ncwAddress() {
        return localStorage.getItem(this.addressKey);
    }

    set ncwAddress(address: string | null) {
        address ? localStorage.setItem(this.addressKey, address) : localStorage.removeItem(this.addressKey);
    }
}
