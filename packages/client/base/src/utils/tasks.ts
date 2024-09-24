export type CancellableTask = {
    cancel: () => void;
};

export function queueTask(callback: () => void, endTime: number): CancellableTask {
    let cancelled = false;

    function checkTime() {
        if (cancelled) {
            return;
        }

        const timeLeft = endTime - Date.now();
        if (timeLeft <= 0) {
            callback();
        } else {
            requestAnimationFrame(checkTime);
        }
    }

    checkTime();

    return {
        cancel: () => {
            cancelled = true;
        },
    };
}
