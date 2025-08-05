import { fireEvent, render } from "@testing-library/react";
import { useEffect } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createCrossmint } from "@crossmint/common-sdk-base";

import { useCrossmint } from "./useCrossmint";
import { CrossmintProvider } from "@/providers";

const MOCK_API_KEY =
    "sk_development_5ZUNkuhjP8aYZEgUTDfWToqFpo5zakEqte1db4pHZgPAVKZ9JuSvnKeGiqY654DoBuuZEzYz4Eb8gRV2ePqQ1fxTjEP8tTaUQdzbGfyG9RgyeN5YbqViXinqxk8EayEkAGtvSSgjpjEr6iaBptJtUFwPW59DjQzTQP6P8uZdiajenVg7bARGKjzFyByNuVEoz41DpRB4hDZNFdwCTuf5joFv";

vi.mock("@crossmint/common-sdk-base", async () => {
    const actual = await vi.importActual("@crossmint/common-sdk-base");
    return {
        ...actual,
        createCrossmint: vi.fn(),
    };
});

function renderCrossmintProvider({ children }: { children: JSX.Element }) {
    return render(<CrossmintProvider apiKey={MOCK_API_KEY}>{children}</CrossmintProvider>);
}

describe("CrossmintProvider", () => {
    beforeEach(() => {
        vi.resetAllMocks();
        vi.mocked(createCrossmint).mockImplementation(() => ({
            apiKey: MOCK_API_KEY,
            setJwt: vi.fn(),
        }));
    });

    it("provides initial JWT value", () => {
        const TestComponent = () => {
            const { crossmint } = useCrossmint();
            return (
                <div>
                    <div data-testid="jwt">{crossmint.jwt}</div>
                </div>
            );
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
        fireEvent.click(getByText("Update JWT"));
        expect(getByTestId("jwt").textContent).toBe("new_jwt");
    });

    it("updates JWT with setJwt", () => {
        const TestComponent = () => {
            const { crossmint, setJwt } = useCrossmint();
            useEffect(() => {
                setJwt("sdk_updated_jwt");
            }, [setJwt]);

            return (
                <div>
                    <div data-testid="jwt">{crossmint.jwt}</div>
                </div>
            );
        };
        const { getByTestId } = renderCrossmintProvider({ children: <TestComponent /> });

        expect(getByTestId("jwt").textContent).toBe("sdk_updated_jwt");
    });

    it("triggers re-render on JWT change", () => {
        const renderCount = vi.fn();
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

        fireEvent.click(getByText("Update JWT"));
        expect(renderCount).toHaveBeenCalledTimes(2);
    });
});
