function StatBox({ label, value }) {
    return (
        <div className="rounded-lg border border-gray-700 bg-gray-900 px-4 py-3 text-center">
            <div className="text-xl font-bold text-gray-100">{value}</div>
            <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
        </div>
    );
}

export default function UserStats({ totalXp, wins, losses, winRate, rank, title }) {
    return (
        <div>
            {title && <p className="mb-2 text-sm font-semibold text-gray-300">{title}</p>}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <StatBox label="XP" value={totalXp} />
                <StatBox label="W / L" value={`${wins} / ${losses}`} />
                <StatBox label="Win %" value={`${winRate}%`} />
                <StatBox label="Rank" value={rank ? `#${rank}` : '—'} />
            </div>
        </div>
    );
}
