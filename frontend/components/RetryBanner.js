// Shown when a request failed after api.js's own automatic retries were
// exhausted (or wasn't retried automatically, e.g. a mutation) — gives the
// user a manual way to try again instead of a dead-end error message.
export default function RetryBanner({ message, onRetry }) {
    return (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-900 bg-red-950/40 p-3 text-sm text-red-400">
            <span>{message}</span>
            {onRetry && (
                <button
                    onClick={onRetry}
                    className="min-h-[44px] rounded-lg border border-red-800 px-3 py-1.5 font-semibold text-red-300 transition hover:border-red-600 hover:text-red-200"
                >
                    Retry
                </button>
            )}
        </div>
    );
}
