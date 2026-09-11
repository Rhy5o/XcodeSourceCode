import { useEffect, useState } from 'react';
import { api } from '../../lib/api';

const SECRET_STORAGE_KEY = 'admin_secret';
const POLL_MS = 5000;

function StatCard({ label, value }) {
    return (
        <div className="rounded-xl border border-gray-700 bg-gray-900 p-4">
            <dt className="text-xs uppercase tracking-wide text-gray-500">{label}</dt>
            <dd className="mt-1 text-2xl font-bold text-gray-100">{value}</dd>
        </div>
    );
}

function HealthRow({ label, ok }) {
    return (
        <div className="flex items-center justify-between border-b border-gray-800 py-2 text-sm last:border-0">
            <span className="text-gray-300">{label}</span>
            <span className={`font-semibold ${ok ? 'text-emerald-400' : 'text-red-400'}`}>{ok ? 'OK' : 'DOWN'}</span>
        </div>
    );
}

// Internal-only page (not linked from the Navbar): gated by the same
// ADMIN_SECRET the backend's requireAdminSecret middleware checks. Entered
// once per browser tab and kept in sessionStorage only (never localStorage)
// so it doesn't linger past the session — this is an ops tool, not a page
// meant for the general user base.
export default function AdminStats() {
    const [secret, setSecret] = useState('');
    const [secretInput, setSecretInput] = useState('');
    const [stats, setStats] = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const stored = typeof window !== 'undefined' ? window.sessionStorage.getItem(SECRET_STORAGE_KEY) : null;
        if (stored) setSecret(stored);
    }, []);

    useEffect(() => {
        if (!secret) return;

        let cancelled = false;
        function load() {
            setLoading(true);
            api.getAdminStats(secret)
                .then((res) => {
                    if (cancelled) return;
                    setStats(res);
                    setError('');
                })
                .catch((err) => {
                    if (cancelled) return;
                    setError(err.message);
                })
                .finally(() => {
                    if (!cancelled) setLoading(false);
                });
        }

        load();
        const id = setInterval(load, POLL_MS);
        return () => {
            cancelled = true;
            clearInterval(id);
        };
    }, [secret]);

    function handleUnlock(e) {
        e.preventDefault();
        window.sessionStorage.setItem(SECRET_STORAGE_KEY, secretInput);
        setSecret(secretInput);
    }

    function handleForget() {
        window.sessionStorage.removeItem(SECRET_STORAGE_KEY);
        setSecret('');
        setSecretInput('');
        setStats(null);
    }

    if (!secret) {
        return (
            <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4 text-gray-100">
                <h1 className="text-xl font-bold">Admin Stats</h1>
                <p className="mt-1 text-sm text-gray-400">Enter the admin secret to view live system stats.</p>
                <form onSubmit={handleUnlock} className="mt-4 flex flex-col gap-2">
                    <label className="sr-only" htmlFor="admin-secret-input">
                        Admin secret
                    </label>
                    <input
                        id="admin-secret-input"
                        type="password"
                        className="min-h-[44px] rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:border-red-500 focus:outline-none"
                        placeholder="Admin secret"
                        aria-label="Admin secret"
                        value={secretInput}
                        onChange={(e) => setSecretInput(e.target.value)}
                        required
                    />
                    <button
                        type="submit"
                        className="min-h-[44px] rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-400"
                    >
                        Unlock
                    </button>
                </form>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-4xl px-4 py-8 text-gray-100">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold">Admin Stats</h1>
                    <p className="text-sm text-gray-400">
                        Live data, refreshing every {POLL_MS / 1000}s{loading ? ' (updating...)' : ''}
                    </p>
                </div>
                <button
                    onClick={handleForget}
                    className="min-h-[44px] rounded-lg border border-gray-700 px-4 py-2 text-sm font-semibold text-gray-100 transition hover:border-gray-500"
                >
                    Lock
                </button>
            </div>

            {error && (
                <p className="mt-4 rounded-lg border border-red-900 bg-red-950/40 p-3 text-sm text-red-400">{error}</p>
            )}

            {stats && (
                <>
                    <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <StatCard label="Users online now" value={stats.usersOnlineNow} />
                        <StatCard label="Races this hour" value={stats.racesThisHour} />
                        <StatCard label="Avg XP / race" value={stats.avgXpPerRace} />
                        <StatCard label="Top winning car" value={stats.mostCommonWinningCar || '—'} />
                    </dl>

                    <div className="mt-6 rounded-xl border border-gray-700 bg-gray-900 p-4">
                        <h2 className="text-lg font-semibold">System health</h2>
                        <div className="mt-2">
                            <HealthRow label="Overall" ok={stats.systemHealth.healthy} />
                            <HealthRow label="Database" ok={stats.systemHealth.database.ok} />
                            <HealthRow label="Redis cache" ok={stats.systemHealth.redis.ok} />
                            <HealthRow label="Race scheduler" ok={stats.systemHealth.scheduler.ok} />
                        </div>
                        <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                            <StatCard label="DB latency" value={`${stats.systemHealth.dbLatencyMs}ms`} />
                            <StatCard label="Cache hit rate" value={`${stats.systemHealth.cache.hitRate}%`} />
                            <StatCard
                                label="Cache hits / misses"
                                value={`${stats.systemHealth.cache.hits} / ${stats.systemHealth.cache.misses}`}
                            />
                        </dl>
                    </div>

                    <p className="mt-4 text-xs text-gray-500">Last updated {new Date(stats.timestamp).toLocaleTimeString()}</p>
                </>
            )}
        </div>
    );
}
