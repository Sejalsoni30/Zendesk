/**
 * Executes an async operation with exponential backoff and randomized full jitter.
 * Formula: delay = min(maxDelay, initialDelay * (factor ^ attempt)) * (0.5 + Math.random() * 0.5)
 */
export async function withExponentialBackoff(fn, options = {}) {
    const { maxRetries = 3, initialDelayMs = 100, maxDelayMs = 2000, backoffFactor = 2, shouldRetry = (err) => {
        // By default, retry on 429 (rate limit), 503 (service unavailable), or timeouts
        const status = err.status || err.statusCode;
        return status === 429 || status === 503 || status === 504 || err.code === 'BOX_UNAVAILABLE' || err.code === 'RATE_LIMITED';
    }, } = options;
    let attempt = 0;
    while (true) {
        try {
            return await fn();
        }
        catch (err) {
            attempt++;
            if (attempt > maxRetries || !shouldRetry(err)) {
                throw err;
            }
            // Calculate exponential backoff
            const rawDelay = Math.min(maxDelayMs, initialDelayMs * Math.pow(backoffFactor, attempt - 1));
            // Apply Full Jitter: randomize between 50% and 100% of calculated delay
            const jitteredDelay = Math.floor(rawDelay * (0.5 + Math.random() * 0.5));
            await new Promise((resolve) => setTimeout(resolve, jitteredDelay));
        }
    }
}
