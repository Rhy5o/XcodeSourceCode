import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Navbar from '../components/Navbar';
import LeaderboardTable from '../components/LeaderboardTable';
import RetryBanner from '../components/RetryBanner';
import { useDebouncedValue } from '../hooks/useDebounce';
import { api } from '../lib/api';

const PAGE_SIZE = 25;

export default function Leaderboard() {
    const router = useRouter();
    const [season, setSeason] = useState('current');
    const [page, setPage] = useState(1);
    const [data, setData] = useState(null);
    const [error, setError] = useState('');
    const [reloadToken, setReloadToken] = useState(0);

    const [query, setQuery] = useState('');
    const debouncedQuery = useDebouncedValue(query, 350);
    const [searchResults, setSearchResults] = useState(null);
    const [searching, setSearching] = useState(false);

    useEffect(() => {
        setError('');
        api.getLeaderboard(season, page, PAGE_SIZE)
            .then(setData)
            .catch((err) => setError(err.message));
    }, [season, page, reloadToken]);

    function handleSeasonChange(e) {
        setSeason(e.target.value);
        setPage(1);
    }

    // Live search-as-you-type: fires once `query` has settled for 350ms
    // rather than on every keystroke. The form's onSubmit still exists for
    // explicit Enter/click, which just short-circuits straight to a search
    // instead of waiting out the debounce.
    useEffect(() => {
        const trimmed = debouncedQuery.trim();
        if (!trimmed) {
            setSearchResults(null);
            return;
        }
        let cancelled = false;
        setSearching(true);
        api.searchUsers(trimmed)
            .then((res) => {
                if (!cancelled) setSearchResults(res.users);
            })
            .catch((err) => {
                if (!cancelled) setError(err.message);
            })
            .finally(() => {
                if (!cancelled) setSearching(false);
            });
        return () => {
            cancelled = true;
        };
    }, [debouncedQuery]);

    function handleSearch(e) {
        e.preventDefault();
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
                    <label className="sr-only" htmlFor="season-select">
                        Season
                    </label>
                    <select
                        id="season-select"
                        value={season}
                        onChange={handleSeasonChange}
                        className="min-h-[44px] rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-100 focus:border-red-500 focus:outline-none"
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

                <form onSubmit={handleSearch} className="mt-4 flex gap-2" role="search">
                    <label className="sr-only" htmlFor="leaderboard-search">
                        Search by username
                    </label>
                    <input
                        id="leaderboard-search"
                        className="flex-1 rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:border-red-500 focus:outline-none"
                        placeholder="Search by username..."
                        aria-label="Search by username"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                    <button
                        type="submit"
                        className="min-h-[44px] rounded-lg bg-gray-800 px-4 py-2 text-sm font-semibold text-gray-100 transition hover:bg-gray-700"
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
                                            className="min-h-[44px] text-sm text-gray-200 hover:text-red-400 hover:underline"
                                        >
                                            {user.username}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}

                {error && <RetryBanner message={error} onRetry={() => setReloadToken((t) => t + 1)} />}

                <div className="mt-6">
                    <LeaderboardTable rows={data?.leaderboard || []} />
                </div>

                {data && data.totalPages > 1 && (
                    <div className="mt-4 flex items-center justify-between text-sm">
                        <button
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page <= 1}
                            className="min-h-[44px] rounded-lg border border-gray-700 px-3 py-1.5 text-gray-200 transition hover:border-gray-500 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            ← Prev
                        </button>
                        <span className="text-gray-400">
                            Page {data.page} of {data.totalPages}
                        </span>
                        <button
                            onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                            disabled={page >= data.totalPages}
                            className="min-h-[44px] rounded-lg border border-gray-700 px-3 py-1.5 text-gray-200 transition hover:border-gray-500 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            Next →
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
