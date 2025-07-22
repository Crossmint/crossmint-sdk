// EVM address: 0x followed by 40 hex chars
export function isValidEvmAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
}

// Solana address: base58, 32-44 chars, not starting with 0x
export function isValidSolanaAddress(address: string): boolean {
    return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
}

// Stellar address: starts with "G" followed by 56 alphanumeric characters
export function isValidStellarAddress(address: string): boolean {
    return /^G[A-Z0-9]{55}$/.test(address);
}

// General: valid if EVM, Solana or Stellar
export function isValidAddress(address: string): boolean {
    return isValidEvmAddress(address) || isValidSolanaAddress(address) || isValidStellarAddress(address);
}
