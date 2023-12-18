interface ExternalCustodian {
    type: "EXTERNAL";
    address: string;
}

export type Custodian = ExternalCustodian | "CROSSMINT_MANAGED" | "NONE";
