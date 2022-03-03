import React from "react";
import { render, fireEvent, screen, act } from "@testing-library/react";
import "@testing-library/jest-dom";

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
    collectionTitle: "CollectionTitle",
    collectionDescription: "CollectionDescription",
    collectionPhoto: "CollectionPhoto",
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
        // TODO(#62): make this tests a bit more maintainable
        expect(global.open).toHaveBeenCalledWith(
            `https://www.crossmint.io/signin?callbackUrl=https%3A%2F%2Fwww.crossmint.io%2Fcheckout%2Fmint%3FclientId%3D${encodeURIComponent(
                defaultProps.clientId
            )}%26closeOnSuccess%3Dfalse%26clientName%3Dclient-sdk-react-ui%26clientVersion%3D${LIB_VERSION}%26mintConfig%3D%257B%2522type%2522%253A%2522candy-machine%2522%257D%26collectionTitle%3D${encodeURIComponent(
                defaultProps.collectionTitle
            )}%26collectionDescription%3D${encodeURIComponent(
                defaultProps.collectionDescription
            )}%26collectionPhoto%3D${encodeURIComponent(defaultProps.collectionPhoto)}`,
            "popUpWindow",
            "height=750,width=400,left=312,top=9,resizable=yes,scrollbars=yes,toolbar=yes,menubar=true,location=no,directories=no, status=yes"
        );
    });

    describe("`onboardingRequests/{clientId}/status` endpoint", () => {
        test("should only be called when instanciating the button with `hideMintOnInactiveClient` prop", async () => {
            await act(async () => {
                render(<CrossmintPayButton {...defaultProps} hideMintOnInactiveClient={true} />);
            });
            expect(global.fetch).toHaveBeenCalledWith(
                `https://www.crossmint.io/api/crossmint/onboardingRequests/${defaultProps.clientId}/status`,
                { headers: { "X-Client-Name": "client-sdk-react-ui", "X-Client-Version": LIB_VERSION } }
            );
        });

        // Uncomment when #40 is done
        /* test("should not be called when not passing `hideMintOnInactiveClient` prop", async () => {
            await act(async () => {
                render(<CrossmintPayButton {...defaultProps} />);
            });
            expect(global.fetch).not.toHaveBeenCalled();
        }); */

        test("should  be called with localhost url when `development` prop passed", async () => {
            await act(async () => {
                render(<CrossmintPayButton {...defaultProps} development={true} hideMintOnInactiveClient={true} />);
            });
            expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining("localhost:3001"), expect.anything());
        });

        test("should not be called if clientId is not a UUID", async () => {
            const notUUIDString = "randomString";
            await act(async () => {
                render(
                    <CrossmintPayButton
                        {...defaultProps}
                        clientId={notUUIDString}
                        development={true}
                        hideMintOnInactiveClient={true}
                    />
                );
            });
            expect(global.fetch).not.toHaveBeenCalled();
        });
    });
});
