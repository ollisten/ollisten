export type DebouncedFunction<T extends any[], R> = {
    (...args: T): Promise<R>;
    cancel: (reason?: string) => void;
};

export default function debounce<T extends any[], R>(
    func: (...args: T) => Promise<R>,
    waitInMs: number,
    immediate: boolean = false
): DebouncedFunction<T, R> {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    let isPromiseRunning = false;
    let latestCall: {
        args: T;
        resolve: (value: R) => void;
        reject: (reason?: any) => void;
    } | null = null;

    const executeFunc = async (args: T): Promise<R> => {
        isPromiseRunning = true;
        try {
            return await func(...args);
        } finally {
            isPromiseRunning = false;

            // If a new call came in while this one was running,
            // schedule it to run after the debounce period
            if (latestCall) {
                const { args: nextArgs, resolve: nextResolve, reject: nextReject } = latestCall;
                latestCall = null;

                timeout = setTimeout(() => {
                    timeout = null;
                    executeFunc(nextArgs)
                        .then(nextResolve)
                        .catch(nextReject);
                }, waitInMs);
            }
        }
    };

    const debounced: DebouncedFunction<T, R> = function (...args: T): Promise<R> {
        return new Promise((resolve, reject) => {
            // If a promise is currently running, store this call
            if (isPromiseRunning) {
                // Replace any previous latest call
                latestCall = { args, resolve, reject };
                return;
            }

            // Determine if this call should execute immediately
            const shouldExecuteImmediately = immediate && !timeout;

            // Clear any existing timeout
            if (timeout) {
                clearTimeout(timeout);
                timeout = null;
            }

            if (shouldExecuteImmediately) {
                // Execute immediately
                executeFunc(args)
                    .then(resolve)
                    .catch(reject);
            } else {
                // Store this call and set a timeout
                latestCall = { args, resolve, reject };

                timeout = setTimeout(() => {
                    timeout = null;
                    if (latestCall) {
                        const { args: nextArgs, resolve: nextResolve, reject: nextReject } = latestCall;
                        latestCall = null;

                        executeFunc(nextArgs)
                            .then(nextResolve)
                            .catch(nextReject);
                    }
                }, waitInMs);
            }
        });
    };

    debounced.cancel = (reason = 'Debounce cancelled') => {
        if (timeout) {
            clearTimeout(timeout);
            timeout = null;
        }

        if (latestCall) {
            latestCall.reject(new Error(reason));
            latestCall = null;
        }
    };

    return debounced;
}
