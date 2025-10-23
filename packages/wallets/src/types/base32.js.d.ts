declare module 'base32.js' {
  export function encode(input: string | Buffer): string;
  export function decode(input: string): Buffer;
}
