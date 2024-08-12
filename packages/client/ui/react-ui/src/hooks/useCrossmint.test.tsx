import { act, render } from "@testing-library/react";
import { useEffect } from "react";

import { Crossmint } from "@crossmint/common-sdk-base";

import { CrossmintProvider, useCrossmint } from "./useCrossmint";

const MOCK_API_KEY =
    "sk_development_5ZUNkuhjP8aYZEgUTDfWToqFpo5zakEqte1db4pHZgPAVKZ9JuSvnKeGiqY654DoBuuZEzYz4Eb8gRV2ePqQ1fxTjEP8tTaUQdzbGfyG9RgyeN5YbqViXinqxk8EayEkAGtvSSgjpjEr6iaBptJtUFwPW59DjQzTQP6P8uZdiajenVg7bARGKjzFyByNuVEoz41DpRB4hDZNFdwCTuf5joFv";

jest.mock("@crossmint/common-sdk-base", () => {
    const actualModule = jest.requireActual("@crossmint/common-sdk-base");

    return {
        ...actualModule,
        createCrossmint: jest.fn(() => ({
            apiKey: MOCK_API_KEY,
        })),
    };
});

class MockSDK {
    constructor(public crossmint: Crossmint) {}
    somethingThatUpdatesJWT(newJWT: string) {
        this.crossmint.jwt = newJWT;
    }
}

function renderCrossmintProvider({ children }: { children: JSX.Element }) {
    return render(<CrossmintProvider apiKey={MOCK_API_KEY}>{children}</CrossmintProvider>);
}

describe("CrossmintProvider", () => {
    it("provides initial JWT value", () => {
        const TestComponent = () => {
            const { crossmint } = useCrossmint();
            return <div data-testid="jwt">{crossmint.jwt}</div>;
        };
        const { getByTestId } = renderCrossmintProvider({ children: <TestComponent /> });
        expect(getByTestId("jwt").textContent).toBe("");
    });

    it("updates JWT using setJwt", () => {
        const TestComponent = () => {
            const { crossmint, setJwt } = useCrossmint();
            return (
                <div>
                    <div data-testid="jwt">{crossmint.jwt}</div>
                    <button onClick={() => setJwt("new_jwt")}>Update JWT</button>
                </div>
            );
        };
        const { getByTestId, getByText } = renderCrossmintProvider({ children: <TestComponent /> });
        act(() => {
            getByText("Update JWT").click();
        });
        expect(getByTestId("jwt").textContent).toBe("new_jwt");
    });

    it("updates JWT using WalletSDK", () => {
        const TestComponent = () => {
            const { crossmint } = useCrossmint();
            useEffect(() => {
                const wallet = new MockSDK(crossmint);
                wallet.somethingThatUpdatesJWT("sdk_jwt");
            }, []);
            return <div data-testid="jwt">{crossmint.jwt}</div>;
        };
        const { getByTestId } = renderCrossmintProvider({ children: <TestComponent /> });
        expect(getByTestId("jwt").textContent).toBe("sdk_jwt");
    });

    it("triggers re-render on JWT change", () => {
        const renderCount = jest.fn();
        const TestComponent = () => {
            const { crossmint, setJwt } = useCrossmint();
            useEffect(() => {
                renderCount();
            });
            return (
                <div>
                    <div data-testid="jwt">{crossmint.jwt}</div>
                    <button onClick={() => setJwt("new_jwt")}>Update JWT</button>
                </div>
            );
        };

        const { getByText } = renderCrossmintProvider({ children: <TestComponent /> });

        expect(renderCount).toHaveBeenCalledTimes(1);

        act(() => {
            getByText("Update JWT").click();
        });

        expect(renderCount).toHaveBeenCalledTimes(2);
    });
});