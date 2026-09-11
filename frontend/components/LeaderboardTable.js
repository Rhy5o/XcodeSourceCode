import { memo } from 'react';
import { useRouter } from 'next/router';

// Leaderboard rows re-render on every poll/page/season change of the parent
// page; memoizing means a re-render is skipped unless `rows` itself changed
// (a new array reference from a fresh API response), not on unrelated state
// changes in the parent (e.g. the search box being typed into).
//
// Below the `sm` breakpoint a 5-column table doesn't fit 375px without
// horizontal scrolling, so mobile gets a stacked card per row instead (item
// 12: "no side-by-side unless space allows") — the table markup is kept for
// sm and up, where there's room for it.
function LeaderboardTable({ rows }) {
    const router = useRouter();

    if (rows.length === 0) {
        return (
            <div className="rounded-xl border border-gray-700 bg-gray-900 p-4">
                <p className="text-sm text-gray-500">No races have finished yet this season.</p>
            </div>
        );
    }

    return (
        <>
            <div className="flex flex-col gap-2 sm:hidden">
                {rows.map((row) => (
                    <button
                        key={row.user_id}
                        onClick={() => router.push(`/users/${row.user_id}`)}
                        className="min-h-[44px] rounded-xl border border-gray-700 bg-gray-900 p-3 text-left transition hover:border-gray-500"
                    >
                        <div className="flex items-center justify-between gap-2">
                            <span className="font-medium text-gray-100">
                                #{row.rank} {row.username}
                            </span>
                            <span className="text-sm text-gray-300">{row.total_xp} XP</span>
                        </div>
                        <div className="mt-1 flex items-center justify-between gap-2 text-xs text-gray-500">
                            <span>{row.reg_plate}</span>
                            <span>
                                {row.wins}W / {row.losses}L
                            </span>
                        </div>
                    </button>
                ))}
            </div>

            <div className="hidden overflow-x-auto rounded-xl border border-gray-700 bg-gray-900 sm:block">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-gray-800 text-left text-gray-400">
                            <th className="px-4 py-3">#</th>
                            <th className="px-4 py-3">Driver</th>
                            <th className="px-4 py-3">Reg plate</th>
                            <th className="px-4 py-3">XP</th>
                            <th className="px-4 py-3">W / L</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row) => (
                            <tr key={row.user_id} className="border-b border-gray-800 last:border-0">
                                <td className="px-4 py-3 text-gray-400">{row.rank}</td>
                                <td className="px-4 py-3">
                                    <button
                                        onClick={() => router.push(`/users/${row.user_id}`)}
                                        className="min-h-[44px] font-medium text-gray-100 hover:text-red-400 hover:underline"
                                    >
                                        {row.username}
                                    </button>
                                </td>
                                <td className="px-4 py-3 text-gray-500">{row.reg_plate}</td>
                                <td className="px-4 py-3">{row.total_xp}</td>
                                <td className="px-4 py-3">
                                    {row.wins} / {row.losses}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </>
    );
}

export default memo(LeaderboardTable);
