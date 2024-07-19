import { logInfo } from "../services/logging";
import { LoggerWrapper } from "./log";
import * as logModule from "./log";

jest.mock("../services/logging");

describe("Log test", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("LoggerWrapper", () => {
        const addOne = (input: number): number => input + 1;

        class BaseClass extends LoggerWrapper {
            constructor() {
                super("BaseClass");
            }

            someMethod(input: number): any {
                return addOne(input);
            }
        }

        it("should return the same value and log the input and output of myMethod", () => {
            const base = new BaseClass();
            const input = 2;
            const result = base.someMethod(input);

            expect(result).toEqual(addOne(input));
            expect(logInfo).toHaveBeenCalledTimes(2);

            const logInfoCalls = (logInfo as jest.MockedFunction<typeof logInfo>).mock.calls;
            expect(logInfoCalls[0][0].includes("input")).toBeTruthy();
            expect(logInfoCalls[0][0].includes(String(input))).toBeTruthy();
            expect(logInfoCalls[1][0].includes("output")).toBeTruthy();
            expect(logInfoCalls[1][0].includes(String(result))).toBeTruthy();
        });
    });

    describe("logInputOutput", () => {
        const addTwo = (input: number): number => input + 2;

        it("should log the input and output of the function", () => {
            const addTwoWithLogging = logModule.logInputOutput((arg: number) => addTwo(arg), "addTwo");

            const input = 2;
            const result = addTwoWithLogging(input);

            expect(result).toEqual(addTwo(input));
            expect(logInfo).toHaveBeenCalledTimes(2);

            const logInfoCalls = (logInfo as jest.MockedFunction<typeof logInfo>).mock.calls;
            expect(logInfoCalls[0][0].includes("input")).toBeTruthy();
            expect(logInfoCalls[0][0].includes(String(input))).toBeTruthy();
            expect(logInfoCalls[1][0].includes("output")).toBeTruthy();
            expect(logInfoCalls[1][0].includes(String(result))).toBeTruthy();
        });
    });

    describe("logPerformance", () => {
        const addThree = async (input: number): Promise<number> => input + 3;

        it("should log the time", async () => {
            const input = 3;

            const result = await logModule.logPerformance("addThreeString", () => addThree(input));

            expect(result).toEqual(await addThree(input));
            expect(logInfo).toHaveBeenCalledTimes(1);

            const logInfoCalls = (logInfo as jest.MockedFunction<typeof logInfo>).mock.calls;
            expect(logInfoCalls[0][0].includes("TIME")).toBeTruthy();
        });
    });
});
