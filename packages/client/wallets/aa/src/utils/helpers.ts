export function isLocalhost() {
    if (process.env.NODE_ENV === 'test') {
        return false;
    }
   
    return window.location.origin.includes("localhost");
}
