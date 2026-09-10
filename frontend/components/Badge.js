function formatDate(dateString) {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function Badge({ badge }) {
    const locked = !badge.earned;
    const hasProgress = badge.target && badge.target > 1;

    return (
        <div
            className={`group relative flex flex-col items-center gap-1 rounded-xl border p-4 text-center transition ${
                locked ? 'border-gray-800 bg-gray-900/50 opacity-50' : 'border-emerald-800 bg-emerald-950/20'
            }`}
        >
            <span className={`text-3xl ${locked ? 'grayscale' : ''}`}>{badge.icon_url || '🏅'}</span>
            <span className="text-sm font-semibold text-gray-100">{badge.name}</span>

            {locked && hasProgress && (
                <span className="text-xs text-gray-500">
                    {badge.progress}/{badge.target}
                </span>
            )}
            {!locked && badge.earnedAt && (
                <span className="text-xs text-emerald-400">{formatDate(badge.earnedAt)}</span>
            )}

            <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 w-48 -translate-x-1/2 rounded-lg border border-gray-700 bg-gray-950 p-2 text-xs text-gray-300 opacity-0 shadow-lg transition group-hover:opacity-100">
                {badge.description}
                {locked && hasProgress && (
                    <div className="mt-1 text-gray-500">
                        Progress: {badge.progress}/{badge.target}
                    </div>
                )}
            </div>
        </div>
    );
}
