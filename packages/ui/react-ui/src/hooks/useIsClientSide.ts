import { useState, useEffect } from "react";

export default function useIsClientSide() {
    const [isClientSide, setIsClientSide] = useState(false);
    useEffect(() => {
        setIsClientSide(true);
    });

    return { isClientSide };
}
