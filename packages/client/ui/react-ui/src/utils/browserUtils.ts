/**
 * Detects if the current browser is a mobile wallet browser that may block popups
 * @returns true if running in a wallet browser environment
 */
export function isWalletBrowser(): boolean {
    if (typeof window === 'undefined') {
        return false;
    }

    if ((window as any).phantom?.solana) {
        return true;
    }
    
    if ((window as any).ethereum?.isCoinbaseWallet) {
        return true;
    }
    
    if ((window as any).ethereum?.isMetaMask && isMobileDevice()) {
        return true;
    }
    
    if (typeof navigator !== 'undefined') {
        const userAgent = navigator.userAgent.toLowerCase();
        const walletBrowsers = [
            'phantom',
            'coinbasewallet',
            'trustwallet',
            'rainbow',
            'metamask'
        ];
        
        return walletBrowsers.some(wallet => userAgent.includes(wallet));
    }
    
    return false;
}

/**
 * Helper function to detect mobile devices
 * @returns true if running on a mobile device
 */
function isMobileDevice(): boolean {
    if (typeof navigator === 'undefined') {
        return false;
    }
    
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}
