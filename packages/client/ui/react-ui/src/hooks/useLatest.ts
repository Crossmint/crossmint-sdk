import { useRef } from "react";

/**
 * Keeps a ref pointing at the newest value. For listeners subscribed once, reading callbacks off
 * this ref is what keeps a late event calling the current render's props rather than the ones
 * captured at subscribe time. Assigned during render, not in an effect, so an event delivered
 * between commit and the effect flush still sees the newest value.
 */
export function useLatest<T>(value: T) {
    const ref = useRef(value);
    ref.current = value;
    return ref;
}
