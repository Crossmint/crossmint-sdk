import { useEffect, useState } from "react";

export default function useEnvironment() {
    const [isSSR, setIsSSR] = useState(true);
    useEffect(() => {
        setIsSSR(false);
    }, []);

    return { isSSR };
}
