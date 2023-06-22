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
            mintConfig: JSON.stringify({ type: "candy-machine" }),
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

    describe("`onboardingRequests/{clientId}/status` endpoint", () => {
        test("should only be called when instanciating the button with `hideMintOnInactiveClient` prop", async () => {
            await act(async () => {
                render(<CrossmintPayButton {...defaultProps} hideMintOnInactiveClient={true} />);
            });
            expect(global.fetch).toHaveBeenCalledWith(
                `https://www.crossmint.com/api/crossmint/onboardingRequests/${defaultProps.clientId}/status`,
                { headers: { "X-Client-Name": "client-sdk-react-ui", "X-Client-Version": LIB_VERSION } }
            );
        });

        test("should not be called when not passing `hideMintOnInactiveClient` prop", async () => {
            await act(async () => {
                render(<CrossmintPayButton {...defaultProps} />);
            });
            expect(global.fetch).not.toHaveBeenCalled();
        });

        test("should  be called with free string url when `environment` prop passed", async () => {
            await act(async () => {
                render(
                    <CrossmintPayButton
                        {...defaultProps}
                        environment="localhost:3001"
                        hideMintOnInactiveClient={true}
                    />
                );
            });
            expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining("localhost:3001"), expect.anything());
        });

        test("should be called with stating url when passing `staging` enum in `environment` prop", async () => {
            await act(async () => {
                render(<CrossmintPayButton {...defaultProps} environment="staging" hideMintOnInactiveClient={true} />);
            });
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining("https://staging.crossmint.com"),
                expect.anything()
            );
        });

        test("should be called with stating url when passing `prod` enum in `environment` prop", async () => {
            await act(async () => {
                render(<CrossmintPayButton {...defaultProps} environment="prod" hideMintOnInactiveClient={true} />);
            });
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining("https://www.crossmint.com"),
                expect.anything()
            );
        });

        test("should not be called if clientId is not a UUID", async () => {
            const notUUIDString = "randomString";
            await act(async () => {
                render(
                    <CrossmintPayButton {...defaultProps} clientId={notUUIDString} hideMintOnInactiveClient={true} />
                );
            });
            expect(global.fetch).not.toHaveBeenCalled();
        });

        test("should be called with stating url when passing `prod` enum in `environment` prop", async () => {
            await act(async () => {
                render(
                    <CrossmintPayButton {...defaultProps} environment={baseUrls.prod} hideMintOnInactiveClient={true} />
                );
            });
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining("https://www.crossmint.com"),
                expect.anything()
            );
        });

        test("should not be called if clientId is not a UUID", async () => {
            const notUUIDString = "randomString";
            await act(async () => {
                render(
                    <CrossmintPayButton {...defaultProps} clientId={notUUIDString} hideMintOnInactiveClient={true} />
                );
            });
            expect(global.fetch).not.toHaveBeenCalled();
        });

        describe("paymentMethod prop", () => {
            test("should display `Buy with Credit card` text when prop is not set", async () => {
                render(<CrossmintPayButton {...defaultProps} />);
                expect(screen.getByRole("button-paragraph")).toHaveTextContent("Buy with credit card");
            });

            test("should display `Buy with ETH` text when prop is set to `ETH`", async () => {
                render(<CrossmintPayButton {...defaultProps} paymentMethod="ETH" />);
                expect(screen.getByRole("button-paragraph")).toHaveTextContent("Buy with ETH");
            });

            test("should display `Buy with SOL` text when prop is set to `SOL`", async () => {
                render(<CrossmintPayButton {...defaultProps} paymentMethod="SOL" />);
                expect(screen.getByRole("button-paragraph")).toHaveTextContent("Buy with SOL");
            });

            test("should add `paymentMethod=ETH` query param to checkout url when prop added", async () => {
                render(<CrossmintPayButton {...defaultProps} paymentMethod="ETH" />);

                await act(async () => {
                    fireEvent.click(screen.getByText("Buy with ETH"));
                });
                expect(global.open).toHaveBeenCalledWith(
                    expect.stringContaining("paymentMethod%3Deth"),
                    expect.anything(),
                    expect.anything()
                );
            });

            test("should add `paymentMethod=SOL` query param to checkout url when prop added", async () => {
                render(<CrossmintPayButton {...defaultProps} paymentMethod="SOL" />);

                await act(async () => {
                    fireEvent.click(screen.getByText("Buy with SOL"));
                });
                expect(global.open).toHaveBeenCalledWith(
                    expect.stringContaining("paymentMethod%3Dsol"),
                    expect.anything(),
                    expect.anything()
                );
            });
        });

        describe("preferredSigninMethod prop", () => {
            test("should add query param when prop added with value metamask", async () => {
                render(<CrossmintPayButton {...defaultProps} preferredSigninMethod="metamask" />);
                await act(async () => {
                    fireEvent.click(screen.getByText("Buy with credit card"));
                });
                expect(global.open).toHaveBeenCalledWith(
                    expect.stringContaining("preferredSigninMethod%3Dmetamask"),
                    expect.anything(),
                    expect.anything()
                );
            });

            test("should add query param when prop added with value solana", async () => {
                render(<CrossmintPayButton {...defaultProps} preferredSigninMethod="solana" />);
                await act(async () => {
                    fireEvent.click(screen.getByText("Buy with credit card"));
                });
                expect(global.open).toHaveBeenCalledWith(
                    expect.stringContaining("preferredSigninMethod%3Dsolana"),
                    expect.anything(),
                    expect.anything()
                );
            });

            test("should not add query param when prop not added", async () => {
                render(<CrossmintPayButton {...defaultProps} />);
                await act(async () => {
                    fireEvent.click(screen.getByText("Buy with credit card"));
                });
                expect(global.open).not.toHaveBeenCalledWith(
                    expect.stringContaining("preferredSigninMethod%3Dmetamask"),
                    expect.anything(),
                    expect.anything()
                );
            });
        });
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

            const urlOrigin = "https://www.crossmint.com";

            const mintQueryParams = new URLSearchParams({
                clientId: defaultProps.clientId,
                clientName: "client-sdk-react-ui",
                clientVersion: LIB_VERSION,
                mintConfig: JSON.stringify({ type: "candy-machine" }),
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
            expect(global.open).toHaveBeenCalledWith(expectedURL, expect.anything(), expect.anything());
        });
    });
});
