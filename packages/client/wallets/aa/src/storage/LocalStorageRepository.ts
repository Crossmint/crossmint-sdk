export class LocalStorageRepository {
    private NCW_DEVICE_ID_KEY = "NCW-deviceId";
    private NCW_WALLET_ID_KEY = "NCW-walletId";
    private NCW_ADDRESS_KEY = "NCW-address";

    get ncwData() {
        const deviceId = localStorage.getItem(this.NCW_DEVICE_ID_KEY);
        const walletId = localStorage.getItem(this.NCW_WALLET_ID_KEY);
        return deviceId && walletId ? { walletId, deviceId } : null;
    }

    set ncwData(data: { walletId: string; deviceId: string } | null) {
        if (!data) {
            return;
        }
        const { walletId, deviceId } = data;
        localStorage.setItem(this.NCW_DEVICE_ID_KEY, deviceId);
        localStorage.setItem(this.NCW_WALLET_ID_KEY, walletId);
    }

    get ncwAddress() {
        return localStorage.getItem(this.NCW_ADDRESS_KEY);
    }

    set ncwAddress(address: string | null) {
        address ? localStorage.setItem(this.NCW_ADDRESS_KEY, address) : localStorage.removeItem(this.NCW_ADDRESS_KEY);
    }
}
