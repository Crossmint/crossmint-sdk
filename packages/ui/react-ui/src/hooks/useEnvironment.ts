import { useEffect, useState } from "react";

export default function useEnvironment() {
    const [isServerSideRendering, setIsServerSideRendering] = useState(true);
    useEffect(() => {
        setIsServerSideRendering(false);
    }, []);

    return { isServerSideRendering };
}
