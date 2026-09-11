import Link from 'next/link';

function formatCountdown(seconds) {
    if (seconds === null || seconds === undefined) return '—:—';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
}

export default function ShowStatus({ status, loading, error, secondsLeft, onGoOnline, onGoOffline, busy }) {
    if (loading) {
        return (
            <div className="flex justify-center py-10">
                <div
                    className="h-10 w-10 animate-spin rounded-full border-4 border-gray-700 border-t-red-500"
                    role="status"
                    aria-label="Loading show status"
                />
            </div>
        );
    }

    if (error) {
        return <p className="rounded-xl border border-red-900 bg-red-950/40 p-4 text-sm text-red-400">{error}</p>;
    }

    if (!status) return null;

    return (
        <div className="rounded-xl border border-gray-700 bg-gray-900 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <p className="text-lg font-semibold text-gray-100">
                        {status.isUserOnline
                            ? 'Your car is at the show'
                            : status.isCarAtTheShow
                              ? 'Go online to race'
                              : 'No car active — activate one in your garage first'}
                    </p>
                    {status.isUserOnline && (
                        <p className="mt-1 text-sm text-gray-400">Next race in {formatCountdown(secondsLeft)}</p>
                    )}
                </div>

                {status.isCarAtTheShow ? (
                    <button
                        onClick={status.isUserOnline ? onGoOffline : onGoOnline}
                        disabled={busy}
                        className={`min-h-[44px] rounded-lg px-4 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${
                            status.isUserOnline ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-500 hover:bg-red-400'
                        }`}
                    >
                        {busy ? 'Please wait...' : status.isUserOnline ? 'Go Offline' : 'Go Online'}
                    </button>
                ) : (
                    <Link href="/garage" className="inline-flex min-h-[44px] items-center rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-400">
                        Go to Garage
                    </Link>
                )}
            </div>

            {status.lastMatchResult && (
                <div
                    className={`mt-4 rounded-lg border p-3 text-sm ${
                        status.lastMatchResult.draw
                            ? 'border-gray-700 bg-gray-800 text-gray-300'
                            : status.lastMatchResult.won
                              ? 'border-emerald-800 bg-emerald-950/40 text-emerald-300'
                              : 'border-red-900 bg-red-950/30 text-red-300'
                    }`}
                >
                    {status.lastMatchResult.draw
                        ? `Draw vs ${status.lastMatchResult.opponentCar}`
                        : status.lastMatchResult.won
                          ? `Won! +${status.lastMatchResult.xpEarned} XP vs ${status.lastMatchResult.opponentCar}`
                          : `Lost vs ${status.lastMatchResult.opponentCar}`}
                </div>
            )}
        </div>
    );
}
