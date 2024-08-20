import { useEffect, useState } from "react";

export default function useDebounce<T>(initialValue: T, delay: number): [T, React.Dispatch<React.SetStateAction<T>>] {
    const [state, setState] = useState<T>(initialValue);
    const [debouncedValue, setDebouncedValue] = useState<T>(initialValue);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(state);
        }, delay);

        return () => {
            clearTimeout(handler);
        };
    }, [state, delay]);

    return [debouncedValue, setState];
}
