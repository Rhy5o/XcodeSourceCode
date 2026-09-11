import { useEffect, useState } from 'react';
import Navbar from '../../components/Navbar';
import ClanList from '../../components/ClanList';
import RetryBanner from '../../components/RetryBanner';
import { useDebouncedValue } from '../../hooks/useDebounce';
import { api, getToken, getUser } from '../../lib/api';

export default function ClansIndex() {
    const [data, setData] = useState(null);
    const [error, setError] = useState('');
    const [q, setQ] = useState('');
    const debouncedQ = useDebouncedValue(q, 350);
    const [sort, setSort] = useState('members');
    const [page, setPage] = useState(1);

    const [myClanId, setMyClanId] = useState(null);
    const [busyClanId, setBusyClanId] = useState(null);
    // Set only inside useEffect (client-only) so the first client render
    // matches the server-rendered (logged-out) markup — calling getToken()
    // directly in the render body reads localStorage during SSR too,
    // which always sees "logged out" there and causes a hydration mismatch.
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    const [showCreateForm, setShowCreateForm] = useState(false);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState('');

    // Debounced live search: resets to page 1 whenever the settled query or
    // sort order changes, then loads. Typing further within the 350ms window
    // just pushes debouncedQ out further rather than firing a request per key.
    useEffect(() => {
        setPage(1);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debouncedQ, sort]);

    useEffect(() => {
        setError('');
        api.listClans({ q: debouncedQ, sort, page, limit: 25 })
            .then(setData)
            .catch((err) => setError(err.message));
    }, [debouncedQ, sort, page]);

    useEffect(() => {
        const currentUser = getToken() && getUser();
        setIsLoggedIn(!!currentUser);
        if (!currentUser) return;
        api.getUserProfile(currentUser.id)
            .then((res) => setMyClanId(res.clan ? res.clan.id : null))
            .catch(() => {});
    }, []);

    function handleSearch(e) {
        e.preventDefault();
    }

    function reload() {
        setError('');
        api.listClans({ q: debouncedQ, sort, page, limit: 25 })
            .then(setData)
            .catch((err) => setError(err.message));
    }

    async function handleCreate(e) {
        e.preventDefault();
        setCreateError('');
        setCreating(true);
        try {
            const { clan } = await api.createClan(name, description);
            setMyClanId(clan.id);
            setName('');
            setDescription('');
            setShowCreateForm(false);
            reload();
        } catch (err) {
            setCreateError(err.message);
        } finally {
            setCreating(false);
        }
    }

    async function handleJoin(clanId) {
        setBusyClanId(clanId);
        setError('');
        try {
            await api.joinClan(clanId);
            setMyClanId(clanId);
            reload();
        } catch (err) {
            setError(err.message);
        } finally {
            setBusyClanId(null);
        }
    }

    async function handleLeave(clanId) {
        setBusyClanId(clanId);
        setError('');
        try {
            await api.leaveClan(clanId);
            setMyClanId(null);
            reload();
        } catch (err) {
            setError(err.message);
        } finally {
            setBusyClanId(null);
        }
    }

    return (
        <div>
            <Navbar />
            <div className="mx-auto max-w-4xl px-4 py-8 text-gray-100">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <h1 className="text-2xl font-bold">Clans</h1>
                    {isLoggedIn && (
                        <button
                            onClick={() => setShowCreateForm((s) => !s)}
                            className="min-h-[44px] rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-400"
                        >
                            Create Clan
                        </button>
                    )}
                </div>

                {showCreateForm && (
                    <form
                        onSubmit={handleCreate}
                        className="mt-4 flex flex-col gap-2 rounded-xl border border-gray-700 bg-gray-900 p-4"
                    >
                        <label className="sr-only" htmlFor="clan-name">
                            Clan name
                        </label>
                        <input
                            id="clan-name"
                            className="rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:border-red-500 focus:outline-none"
                            placeholder="Clan name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                        <label className="sr-only" htmlFor="clan-description">
                            Description
                        </label>
                        <input
                            id="clan-description"
                            className="rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:border-red-500 focus:outline-none"
                            placeholder="Description (optional)"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                        {createError && <p className="text-sm text-red-400">{createError}</p>}
                        <button
                            type="submit"
                            disabled={creating}
                            className="min-h-[44px] self-start rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-400 disabled:opacity-60"
                        >
                            {creating ? 'Creating...' : 'Create'}
                        </button>
                    </form>
                )}

                <form onSubmit={handleSearch} className="mt-4 flex flex-wrap gap-2" role="search">
                    <label className="sr-only" htmlFor="clan-search">
                        Search clans by name
                    </label>
                    <input
                        id="clan-search"
                        className="min-h-[44px] flex-1 rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:border-red-500 focus:outline-none"
                        placeholder="Search clans by name..."
                        aria-label="Search clans by name"
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                    />
                    <label className="sr-only" htmlFor="clan-sort">
                        Sort clans
                    </label>
                    <select
                        id="clan-sort"
                        value={sort}
                        onChange={(e) => setSort(e.target.value)}
                        className="min-h-[44px] rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-100 focus:border-red-500 focus:outline-none"
                    >
                        <option value="members">Sort by members</option>
                        <option value="xp">Sort by total XP</option>
                    </select>
                    <button
                        type="submit"
                        className="min-h-[44px] rounded-lg bg-gray-800 px-4 py-2 text-sm font-semibold text-gray-100 transition hover:bg-gray-700"
                    >
                        Search
                    </button>
                </form>

                {error && <RetryBanner message={error} onRetry={reload} />}

                <ClanList
                    clans={data?.clans || []}
                    myClanId={myClanId}
                    busyClanId={busyClanId}
                    onJoin={handleJoin}
                    onLeave={handleLeave}
                    canManage={isLoggedIn}
                />

                {data && data.totalPages > 1 && (
                    <div className="mt-6 flex items-center justify-between text-sm">
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
