import * as LitJsSdk from "@lit-protocol/lit-node-client";

import { crossmintAPI } from "../crossmintAPI";
import { Lit } from "./lit";

jest.mock("@lit-protocol/lit-node-client");

describe("Lit", () => {
    let lit: Lit;
    let litSpy: jest.SpyInstance;

    beforeEach(() => {
        jest.spyOn(crossmintAPI, "getOrigin").mockReturnValue("client");
        lit = new Lit("manzano", { sig: "delegationSig" } as any);
        litSpy = jest.spyOn(LitJsSdk, "LitNodeClient");
        litSpy.mockImplementation(() => {
            return {
                connect: jest.fn(),
            } as any;
        });
        jest.spyOn(LitJsSdk, "checkAndSignAuthMessage").mockResolvedValue({} as any);
    });

    it("should connect to the Lit network", async () => {
        const mockConnect = jest.fn();
        litSpy.mockImplementation(() => {
            return { connect: mockConnect } as any;
        });
        await lit.connect();

        expect(mockConnect).toHaveBeenCalled();
    });
});
