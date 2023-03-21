// TODO: I was encountering some weird issues with typescript compilation errors on the tests. Disabling it for now
// https://stackoverflow.com/questions/71831601/ts2786-component-cannot-be-used-as-a-jsx-component
// @ts-nocheck
import "@testing-library/jest-dom";
import { act, fireEvent, render, screen } from "@testing-library/react";
import React from "react";

import { CrossmintStatusButton } from "../src/CrossmintStatusButton";

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
    platformId: "random-uuid",
    auctionId: "123456",
    mintConfig: {
        example: "12345",
    },
};

afterEach(() => {
    jest.clearAllMocks();
});

describe("CrossmintPayButton", () => {
    test("should open onboarding page on click", async () => {
        render(<CrossmintStatusButton {...defaultProps} />);

        await act(async () => {
            fireEvent.click(screen.getByText("Click here to setup Crossmint"));
        });
        const mintConfig = "%7B%22example%22%3A%2212345%22%7D";
        expect(global.open).toHaveBeenCalledWith(
            `https://www.crossmint.com/developers/onboarding?clientId=${defaultProps.clientId}&platformId=${defaultProps.platformId}&auctionId=${defaultProps.auctionId}&mintConfig=${mintConfig}`,
            "_blank"
        );
    });

    test("should not send platformId and auctionId if not provided", async () => {
        render(<CrossmintStatusButton clientId={defaultProps.clientId} />);

        await act(async () => {
            fireEvent.click(screen.getByText("Click here to setup Crossmint"));
        });
        expect(global.open).toHaveBeenCalledWith(
            `https://www.crossmint.com/developers/onboarding?clientId=${defaultProps.clientId}`,
            "_blank"
        );
    });
});
