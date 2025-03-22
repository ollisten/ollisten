export type DebouncedFunction<T extends any[], R> = {
    (...args: T): Promise<R>;
    cancel: (reason?: string) => void;
};

export default function debounce<T extends any[], R>(
    func: (...args: T) => Promise<R>,
    wait: number,
    immediate: boolean = false
): DebouncedFunction<T, R> {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    let isRunning = false;
    let pendingArgs: T | null = null;
    let pendingResolve: ((value: R) => void) | null = null;
    let pendingReject: ((reason?: any) => void) | null = null;

    const execute = async (args: T): Promise<R> => {
        isRunning = true;
        try {
            const result = await func(...args);
            pendingResolve?.(result);
            return result;
        } catch (error) {
            pendingReject?.(error);
            throw error;
        } finally {
            isRunning = false;
            if (pendingArgs) {
                const nextArgs = pendingArgs;
                const nextResolve = pendingResolve;
                const nextReject = pendingReject;
                pendingArgs = null;
                pendingResolve = null;
                pendingReject = null;
                // Properly chain promises with typed resolution
                execute(nextArgs).then(nextResolve!).catch(nextReject!);
            }
        }
    };

    const debounced: DebouncedFunction<T, R> = function (...args: T): Promise<R> {
        return new Promise((resolve, reject) => {
            if (isRunning) {
                pendingArgs = args;
                pendingResolve = resolve;
                pendingReject = reject;
                return;
            }

            const shouldExecuteNow = immediate && !timeout;

            if (timeout) {
                clearTimeout(timeout);
            }

            const later = async () => {
                timeout = null;
                try {
                    const result = await execute(args);
                    resolve(result);
                } catch (error) {
                    reject(error);
                }
            };

            timeout = setTimeout(later, wait);

            if (shouldExecuteNow) {
                execute(args)
                    .then(resolve)
                    .catch(reject);
            } else {
                pendingResolve = resolve;
                pendingReject = reject;
            }
        });
    };

    debounced.cancel = (reason = 'Debounce cancelled') => {
        if (timeout) {
            clearTimeout(timeout);
            timeout = null;
        }
        if (pendingReject) {
            pendingReject(new Error(reason));
            pendingArgs = null;
            pendingResolve = null;
            pendingReject = null;
        }
    };

    return debounced;
}
