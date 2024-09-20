import isEqual from "lodash.isequal";
import { type DependencyList, type EffectCallback, useEffect, useRef } from "react";

export default function useDeepEffect(callback: EffectCallback, dependencies: DependencyList): void {
    const dependenciesRef = useRef(dependencies);

    useEffect(() => {
        const hasChanged = dependencies.some((dep, i) => !isEqual(dep, dependenciesRef.current[i]));

        if (hasChanged) {
            dependenciesRef.current = dependencies;
            return callback();
        }
    }, [dependencies]);
}
