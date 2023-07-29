import "@testing-library/jest-dom";
import { act, fireEvent, render, screen } from "@testing-library/react";
import React from "react";

import { baseUrls } from "@crossmint/client-sdk-base";

import { CrossmintPayButton } from "../src/CrossmintPayButton";
import { LIB_VERSION } from "../src/version";

// TODO(#60): create a global service for this to work everywhere and to be able to customize resolved/rejected responses
const fetchReturns = Promise.resolve({
    json: () => Promise.resolve({}),
}) as any;
global.fetch = jest.fn(() => fetchReturns);

// TODO(#61): make this automatically mocked in every test suite
const openReturns = {} as Window;
global.open = jest.fn(() => openReturns);
global.console = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
} as any;

const defaultProps = {
    clientId: "a4e1bfcc-9884-11ec-b909-0242ac120002",
};

afterEach(() => {
    jest.clearAllMocks();
});

describe("CrossmintPayButton", () => {
    test("should open window with correct url", async () => {
        render(<CrossmintPayButton {...defaultProps} />);

        await act(async () => {
            fireEvent.click(screen.getByText("Buy with credit card"));
        });

        const urlOrigin = "https://www.crossmint.com";

        const mintQueryParams = new URLSearchParams({
            clientId: defaultProps.clientId,
            clientName: "client-sdk-react-ui",
            clientVersion: LIB_VERSION,
            locale: "en-US",
            currency: "usd",
        }).toString();

        const callbackUrl = encodeURIComponent(`${urlOrigin}/checkout/mint?${mintQueryParams}`);

        const signinURLParams = new URLSearchParams({
            locale: "en-US",
            currency: "usd",
            email: "",
        }).toString();

        const expectedURL = `${urlOrigin}/signin?${signinURLParams}&callbackUrl=${callbackUrl}`;
        expect(global.open).toHaveBeenCalledWith(
            expectedURL,
            "popUpWindow",
            "height=750,width=400,left=312,top=9,resizable=yes,scrollbars=yes,toolbar=yes,menubar=true,location=no,directories=no, status=yes"
        );
    });

    test("should add the `whPassThroughArgs` prop on the window url", async () => {
        const whPassThroughArgs = { hello: "hi" };
        render(<CrossmintPayButton {...defaultProps} whPassThroughArgs={whPassThroughArgs} />);

        await act(async () => {
            fireEvent.click(screen.getByText("Buy with credit card"));
        });
        expect(global.open).toHaveBeenCalledWith(
            expect.stringContaining("whPassThroughArgs%3D%257B%2522hello%2522%253A%2522hi%2522%257D"),
            expect.anything(),
            expect.anything()
        );
    });

    describe("when passing the prepay prop", () => {
        test("should pass the prepay query param", async () => {
            render(<CrossmintPayButton {...defaultProps} prepay />);

            await act(async () => {
                fireEvent.click(screen.getByText("Buy with credit card"));
            });
            expect(global.open).toHaveBeenCalledWith(
                expect.stringContaining("prepay%3Dtrue"),
                expect.anything(),
                expect.anything()
            );
        });
    });

    describe("when passing the prepay prop as false", () => {
        test("should not pass the prepay query param", async () => {
            render(<CrossmintPayButton {...defaultProps} prepay={false} />);

            await act(async () => {
                fireEvent.click(screen.getByText("Buy with credit card"));
            });
            expect(global.open).toHaveBeenCalledWith(
                expect.not.stringContaining("prepay"),
                expect.anything(),
                expect.anything()
            );
        });
    });

    describe("when passing the loginEmail prop", () => {
        test("should pass an email in the email query param", async () => {
            render(<CrossmintPayButton {...defaultProps} loginEmail="user@gmail.com" />);

            await act(async () => {
                fireEvent.click(screen.getByText("Buy with credit card"));
            });
            expect(global.open).toHaveBeenCalledWith(
                expect.stringContaining("email=user%40gmail.com"),
                expect.anything(),
                expect.anything()
            );
        });

        test("should pass the email query param empty if loginEmail is empty", async () => {
            render(<CrossmintPayButton {...defaultProps} loginEmail="" />);

            await act(async () => {
                fireEvent.click(screen.getByText("Buy with credit card"));
            });
            expect(global.open).toHaveBeenCalledWith(
                expect.stringContaining("email=&"),
                expect.anything(),
                expect.anything()
            );
        });

        test("should pass the email query param empty if loginEmail is not present as a param", async () => {
            render(<CrossmintPayButton {...defaultProps} />);

            await act(async () => {
                fireEvent.click(screen.getByText("Buy with credit card"));
            });
            expect(global.open).toHaveBeenCalledWith(
                expect.stringContaining("email=&"),
                expect.anything(),
                expect.anything()
            );
        });
    });

    describe("when passing collectionId instead of clientId", () => {
        test("should open window with correct url", async () => {
            render(<CrossmintPayButton collectionId={defaultProps.clientId} />);

            await act(async () => {
                fireEvent.click(screen.getByText("Buy with credit card"));
            });

            expect(global.open).toHaveBeenCalledWith(
                expect.stringContaining(`clientId%3D${defaultProps.clientId}`),
                expect.anything(),
                expect.anything()
            );
        });
    });

    describe("when passing projectId", () => {
        test("should open window with projectId included in query params", async () => {
            render(<CrossmintPayButton {...defaultProps} projectId="123" />);

            await act(async () => {
                fireEvent.click(screen.getByText("Buy with credit card"));
            });

            expect(global.open).toHaveBeenCalledWith(
                expect.stringContaining(`projectId%3D123`),
                expect.anything(),
                expect.anything()
            );
        });
    });

    describe("when passing getButtonText prop", () => {
        test("should show custom text", async () => {
            render(<CrossmintPayButton {...defaultProps} getButtonText={() => "Custom text"} />);
            expect(screen.getByText("Custom text")).toBeInTheDocument();
        });
    });
});
