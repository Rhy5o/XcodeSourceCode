import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Navbar from '../components/Navbar';
import { api } from '../lib/api';

const PAGE_SIZE = 25;

export default function Leaderboard() {
    const router = useRouter();
    const [season, setSeason] = useState('current');
    const [page, setPage] = useState(1);
    const [data, setData] = useState(null);
    const [error, setError] = useState('');

    const [query, setQuery] = useState('');
    const [searchResults, setSearchResults] = useState(null);
    const [searching, setSearching] = useState(false);

    useEffect(() => {
        setError('');
        api.getLeaderboard(season, page, PAGE_SIZE)
            .then(setData)
            .catch((err) => setError(err.message));
    }, [season, page]);

    function handleSeasonChange(e) {
        setSeason(e.target.value);
        setPage(1);
    }

    async function handleSearch(e) {
        e.preventDefault();
        if (!query.trim()) {
            setSearchResults(null);
            return;
        }
        setSearching(true);
        try {
            const res = await api.searchUsers(query.trim());
            setSearchResults(res.users);
        } catch (err) {
            setError(err.message);
        } finally {
            setSearching(false);
        }
    }

    // Seasons are just an incrementing counter with no "list all seasons"
    // endpoint, so the dropdown is derived from the current season number
    // returned by the leaderboard itself (1..latest), refreshed whenever a
    // response arrives with a higher number than we've seen so far.
    const [latestSeason, setLatestSeason] = useState(1);
    useEffect(() => {
        if (data && season === 'current' && data.season > latestSeason) {
            setLatestSeason(data.season);
        }
    }, [data, season, latestSeason]);
    const seasonOptions = Array.from({ length: latestSeason }, (_, i) => latestSeason - i);

    return (
        <div>
            <Navbar />
            <div className="mx-auto max-w-3xl px-4 py-8 text-gray-100">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <h1 className="text-2xl font-bold">Leaderboard</h1>
                    <select
                        value={season}
                        onChange={handleSeasonChange}
                        className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-100 focus:border-red-500 focus:outline-none"
                    >
                        <option value="current">Current season{data && data.season ? ` (S${data.season})` : ''}</option>
                        {seasonOptions
                            .filter((s) => s !== latestSeason || data?.season !== latestSeason)
                            .map((s) => (
                                <option key={s} value={s}>
                                    Season {s}
                                </option>
                            ))}
                    </select>
                </div>

                <form onSubmit={handleSearch} className="mt-4 flex gap-2">
                    <input
                        className="flex-1 rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:border-red-500 focus:outline-none"
                        placeholder="Search by username..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                    <button
                        type="submit"
                        className="rounded-lg bg-gray-800 px-4 py-2 text-sm font-semibold text-gray-100 transition hover:bg-gray-700"
                    >
                        {searching ? 'Searching...' : 'Search'}
                    </button>
                </form>

                {searchResults !== null && (
                    <div className="mt-3 rounded-xl border border-gray-700 bg-gray-900 p-3">
                        {searchResults.length === 0 ? (
                            <p className="text-sm text-gray-500">No users found.</p>
                        ) : (
                            <ul className="flex flex-col gap-1">
                                {searchResults.map((user) => (
                                    <li key={user.id}>
                                        <button
                                            onClick={() => router.push(`/users/${user.id}`)}
                                            className="text-sm text-gray-200 hover:text-red-400 hover:underline"
                                        >
                                            {user.username}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}

                {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

                <div className="mt-6 overflow-x-auto rounded-xl border border-gray-700 bg-gray-900">
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
                            {data?.leaderboard.map((row) => (
                                <tr key={row.user_id} className="border-b border-gray-800 last:border-0">
                                    <td className="px-4 py-3 text-gray-400">{row.rank}</td>
                                    <td className="px-4 py-3">
                                        <button
                                            onClick={() => router.push(`/users/${row.user_id}`)}
                                            className="font-medium text-gray-100 hover:text-red-400 hover:underline"
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
                    {data && data.leaderboard.length === 0 && (
                        <p className="p-4 text-sm text-gray-500">No races have finished yet this season.</p>
                    )}
                </div>

                {data && data.totalPages > 1 && (
                    <div className="mt-4 flex items-center justify-between text-sm">
                        <button
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page <= 1}
                            className="rounded-lg border border-gray-700 px-3 py-1.5 text-gray-200 transition hover:border-gray-500 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            ← Prev
                        </button>
                        <span className="text-gray-400">
                            Page {data.page} of {data.totalPages}
                        </span>
                        <button
                            onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                            disabled={page >= data.totalPages}
                            className="rounded-lg border border-gray-700 px-3 py-1.5 text-gray-200 transition hover:border-gray-500 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            Next →
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
