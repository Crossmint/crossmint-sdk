/**
 * Runs `fn` over `items` with at most `limit` concurrent invocations in flight.
 * Uses a pull-based worker pool: as soon as one item finishes, its slot is
 * immediately reused for the next pending item, rather than waiting for a
 * whole batch to complete.
 *
 * `fn` must not let errors escape uncaught if a failure for one item shouldn't
 * affect the others - this helper is a pure scheduling primitive and does not
 * swallow errors itself. An uncaught rejection from `fn` will reject the
 * returned promise via `Promise.all`.
 */
export async function mapWithConcurrency<T, R>(
    items: T[],
    limit: number,
    fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
    const results: R[] = new Array(items.length);
    let cursor = 0;

    async function worker() {
        while (cursor < items.length) {
            const i = cursor++;
            results[i] = await fn(items[i], i);
        }
    }

    const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker());
    await Promise.all(workers);

    return results;
}
