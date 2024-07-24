import { abi_ERC_721 } from "./ERC721";

export const abi_ERC_7572 = [
    ...abi_ERC_721,
    // ERC-7572 additional functions
    {
        anonymous: false,
        inputs: [],
        name: "ContractURIUpdated",
        type: "event",
    },
    {
        inputs: [],
        name: "contractURI",
        outputs: [
            {
                internalType: "string",
                name: "",
                type: "string",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
];
