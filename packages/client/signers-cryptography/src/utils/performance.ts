export async function measureFunctionTime<T>(
    fnName: string,
    fn: () => Promise<T>
): Promise<T> {
    const start = performance.now();
    const result = await fn();
    const end = performance.now();
    console.log(
        `Function ${fnName} took ${Math.round(end - start)}ms to execute`
    );
    return result;
}
