export const MOCK_API_KEY = "sk_development_12341234";
export const waitForSettledState = async (callback: () => void) => {
    await new Promise((resolve) => setTimeout(resolve, 20));
    callback();
};
