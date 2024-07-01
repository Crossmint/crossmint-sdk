import * as LitJsSdk from "@lit-protocol/lit-node-client";

import { crossmintAPI } from "../crossmintAPI";
import { Lit } from "./lit";

jest.mock("@lit-protocol/lit-node-client");
jest.mock("@krebitdao/eip712-vc", () => {
    return {
        EIP712VC: jest.fn().mockImplementation(() => {}),
    };
});

describe("Lit", () => {
    let lit: Lit;
    let litSpy: jest.SpyInstance;

    beforeEach(() => {
        jest.spyOn(crossmintAPI, "getOrigin").mockReturnValue("client");
        lit = new Lit();
        litSpy = jest.spyOn(LitJsSdk, "LitNodeClient");
        litSpy.mockImplementation(() => {
            return {
                connect: jest.fn(),
            } as any;
        });
        jest.spyOn(LitJsSdk, "checkAndSignAuthMessage").mockResolvedValue({} as any);
    });

    it("should throw an error when production environment is used", () => {
        expect(() => new Lit("cayenne", "prod")).toThrow("Production environment not supported yet");
    });
});
