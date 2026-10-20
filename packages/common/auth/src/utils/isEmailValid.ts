const MAX_EMAIL_LENGTH = 254; // RFC 5321 limit; also bounds regex backtracking

export function isEmailValid(email: string): boolean {
    if (email.length > MAX_EMAIL_LENGTH) {
        return false;
    }
    // Regular expression for basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}
