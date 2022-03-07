import React from "react";
import { render, fireEvent, screen, act } from "@testing-library/react";
import "@testing-library/jest-dom";

import { CrossmintStatusButton } from "../src/CrossmintStatusButton";
import { launchpadIds } from "../src/types";

// TODO(#60): create a global service for this to work everywhere and to be able to customize resolved/rejected responses
const fetchReturns = Promise.resolve({
    json: () => Promise.resolve({}),
}) as any;
global.fetch = jest.fn(() => fetchReturns);

// TODO(#61): make this automatically mocked in every test suite
const openReturns = {} as Window;
global.open = jest.fn(() => openReturns);

const defaultProps = {
    clientId: "a4e1bfcc-9884-11ec-b909-0242ac120002",
    launchpadId: launchpadIds.holaplex,
    auctionId: "123456",
};

afterEach(() => {
    jest.clearAllMocks();
});

describe("CrossmintPayButton", () => {
    test("should open onboarding page on click", async () => {
        render(<CrossmintStatusButton {...defaultProps} />);

        await act(async () => {
            fireEvent.click(screen.getByText("Click here to setup CrossMint"));
        });
        expect(global.open).toHaveBeenCalledWith(
            `https://www.crossmint.io/developers/onboarding?clientId=${defaultProps.clientId}&launchpadId=${defaultProps.launchpadId}&auctionId=${defaultProps.auctionId}`,
            "_blank"
        );
    });

    test("should not send launchpadId and auctionId if not provided", async () => {
        render(<CrossmintStatusButton clientId={defaultProps.clientId} />);

        await act(async () => {
            fireEvent.click(screen.getByText("Click here to setup CrossMint"));
        });
        expect(global.open).toHaveBeenCalledWith(
            `https://www.crossmint.io/developers/onboarding?clientId=${defaultProps.clientId}`,
            "_blank"
        );
    });
});
