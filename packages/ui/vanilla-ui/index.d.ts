declare global {
    namespace JSX {
        interface IntrinsicElements {
            "crossmint-pay-button": any;
            "crossmint-payment-element": any;
        }
    }
}

// Little hack for the types to work.
// Looks like if you don't export anything, its not recognized.
declare const _: any;

export { _ };
